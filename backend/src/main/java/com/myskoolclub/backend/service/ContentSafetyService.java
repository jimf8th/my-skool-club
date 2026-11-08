package com.myskoolclub.backend.service;

import com.myskoolclub.backend.exception.AppException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/** A conservative first-pass filter; reports and human review remain the final safety layer. */
@Service
public class ContentSafetyService {

    private static final List<Pattern> BLOCKED_PATTERNS = List.of(
            Pattern.compile("\\b(?:kill|shoot|bomb)\\s+(?:you|them|everyone|myself)\\b"),
            Pattern.compile("\\b(?:want to|going to|how to|encourage\\w* to)\\s+(?:kill myself|commit suicide|self[- ]?harm)\\b"),
            Pattern.compile("\\b(?:child porn|sexual content involving minors)\\b"),
            Pattern.compile("\\b(?:nudes?|explicit sexual content)\\b"),
            Pattern.compile("\\b(?:doxx|doxxing)\\b")
    );

    private static final Pattern REPEATED_LINKS = Pattern.compile(
            "(?i)(?:https?://|www\\.)[^\\s]+(?:\\s+.*?){0,8}(?:https?://|www\\.)[^\\s]+(?:\\s+.*?){0,8}(?:https?://|www\\.)[^\\s]+"
    );

    public void requireAllowed(String... fields) {
        for (String value : fields) {
            if (value == null || value.isBlank()) continue;
            String normalized = Normalizer.normalize(value, Normalizer.Form.NFKC)
                    .toLowerCase(Locale.ROOT)
                    .replaceAll("[\\p{Punct}&&[^'-]]+", " ")
                    .replaceAll("\\s+", " ")
                    .trim();
            if (BLOCKED_PATTERNS.stream().anyMatch(pattern -> pattern.matcher(normalized).find())
                    || REPEATED_LINKS.matcher(value).find()) {
                throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "This content may violate our Community Standards. Please revise it or contact support@myskoolclub.com.");
            }
        }
    }
}
