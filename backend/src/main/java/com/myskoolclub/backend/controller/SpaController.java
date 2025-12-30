package com.myskoolclub.backend.controller;

import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;

/**
 * Controller to handle SPA (Single Page Application) routing.
 * Forwards all non-API 404 errors to index.html so React Router can handle routing.
 */
@Controller
public class SpaController implements ErrorController {

    @RequestMapping("/error")
    public String handleError(HttpServletRequest request) {
        Object status = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        
        // If it's a 404 error and not an API request, forward to index.html for React Router
        if (status != null) {
            Integer statusCode = Integer.valueOf(status.toString());
            String requestUri = (String) request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
            
            if (statusCode == 404 && requestUri != null && !requestUri.startsWith("/api/")) {
                return "forward:/index.html";
            }
        }
        
        // For all other errors (including API 404s), show the error
        return "error";
    }
}
