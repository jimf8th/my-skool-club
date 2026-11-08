package com.myskoolclub.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.myskoolclub.backend.dto.ScanReceiptResponse;
import com.myskoolclub.backend.dto.ScannedLineItem;
import com.myskoolclub.backend.exception.AppException;
import com.myskoolclub.backend.model.SchoolTier;
import com.myskoolclub.backend.repository.ClubRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Uses OpenAI's vision-capable chat completions API to read a scanned receipt
 * image and extract candidate line items. This is a stateless "assist" —
 * nothing is persisted here; the caller reviews/edits the result before
 * saving it as a draft invoice.
 */
@Slf4j
@Service
public class ReceiptScanService {

    private static final String SYSTEM_PROMPT = """
            You are a receipt-reading assistant for a school club expense tracker.
            Read the receipt image and extract each purchased line item.
            Respond with ONLY a JSON object of this exact shape, no markdown, no commentary:
            {
              "suggestedTitle": "short 3-6 word summary of the purchase, e.g. 'Craft supplies from Michaels'",
              "suggestedPayeeName": "the store/vendor name printed on the receipt, or null if unreadable",
              "lineItems": [
                { "description": "string", "quantity": integer >= 1, "unitPrice": number > 0 }
              ]
            }
            If a line item's quantity is not printed, use 1. If you cannot read the receipt at all,
            return an empty lineItems array. Do not invent items that are not on the receipt.
            """;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final ClubRepository clubRepository;
    private final String apiKey;
    private final String model;

    public ReceiptScanService(
            ObjectMapper objectMapper,
            ClubRepository clubRepository,
            @Value("${app.openai.api-key:}") String apiKey,
            @Value("${app.openai.model:gpt-4o-mini}") String model,
            @Value("${app.openai.api-url:https://api.openai.com/v1/chat/completions}") String apiUrl) {
        this.objectMapper = objectMapper;
        this.clubRepository = clubRepository;
        this.apiKey = apiKey;
        this.model = model;
        this.restClient = RestClient.builder().baseUrl(apiUrl).build();
    }

    public ScanReceiptResponse scan(Long clubId, String imageBase64) {
        SchoolTier schoolTier = clubRepository.findSchoolTierByClubId(clubId)
                .orElseThrow(() -> new AppException(HttpStatus.NOT_FOUND, "Club not found"));
        if (schoolTier != SchoolTier.PREMIUM) {
            throw new AppException(HttpStatus.FORBIDDEN,
                    "AI receipt scanning is available with Premium schools only. Enter the invoice manually or ask an application administrator about Premium.");
        }
        if (apiKey == null || apiKey.isBlank()) {
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Receipt scanning is not configured on this server.");
        }

        String dataUri = toDataUri(imageBase64);

        Map<String, Object> body = Map.of(
                "model", model,
                "response_format", Map.of("type", "json_object"),
                "max_tokens", 1000,
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user", "content", List.of(
                                Map.of("type", "text", "text", "Extract the line items from this receipt."),
                                Map.of("type", "image_url", "image_url", Map.of("url", dataUri))
                        ))
                )
        );

        String rawContent;
        try {
            JsonNode responseJson = restClient.post()
                    .header("Authorization", "Bearer " + apiKey)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
            rawContent = responseJson != null ? responseJson.at("/choices/0/message/content").asText() : "";
        } catch (RestClientException e) {
            log.error("OpenAI receipt scan request failed", e);
            throw new AppException(HttpStatus.BAD_GATEWAY,
                    "Could not reach the receipt scanning service. Please try again or enter items manually.");
        }

        return parseResponse(rawContent);
    }

    private ScanReceiptResponse parseResponse(String rawContent) {
        try {
            JsonNode parsed = objectMapper.readTree(rawContent);
            String suggestedTitle = parsed.hasNonNull("suggestedTitle") ? parsed.get("suggestedTitle").asText() : null;
            String suggestedPayeeName = parsed.hasNonNull("suggestedPayeeName") ? parsed.get("suggestedPayeeName").asText() : null;

            List<ScannedLineItem> lineItems = new ArrayList<>();
            JsonNode items = parsed.get("lineItems");
            if (items != null && items.isArray()) {
                for (JsonNode item : items) {
                    String description = item.hasNonNull("description") ? item.get("description").asText() : null;
                    if (description == null || description.isBlank()) continue;
                    int quantity = item.hasNonNull("quantity") ? Math.max(1, item.get("quantity").asInt(1)) : 1;
                    BigDecimal unitPrice = item.hasNonNull("unitPrice")
                            ? BigDecimal.valueOf(item.get("unitPrice").asDouble())
                            : BigDecimal.ZERO;
                    lineItems.add(new ScannedLineItem(description, quantity, unitPrice));
                }
            }
            return new ScanReceiptResponse(suggestedTitle, suggestedPayeeName, lineItems);
        } catch (Exception e) {
            // The model output can contain details extracted from a receipt;
            // never copy that potentially sensitive data into server logs.
            log.error("Could not parse OpenAI receipt scan response", e);
            throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Could not read line items from this receipt. Please enter them manually.");
        }
    }

    private String toDataUri(String imageBase64) {
        if (imageBase64.startsWith("data:image")) {
            return imageBase64;
        }
        return "data:image/jpeg;base64," + imageBase64;
    }
}
