package com.myskoolclub.backend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forwards all non-API, non-asset GET requests to index.html so that
 * React Router can handle client-side navigation after a full page refresh.
 */
@Controller
public class SpaController {

    // Matches paths with no file extension that don't start with "api" or "assets"
    @GetMapping(value = {"/{path:^(?!api|assets)[^\\.]*}", "/{path:^(?!api|assets)[^\\.]*}/**"})
    public String forward() {
        return "forward:/index.html";
    }
}
