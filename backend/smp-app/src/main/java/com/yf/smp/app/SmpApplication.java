package com.yf.smp.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.yf.smp")
public class SmpApplication {
    public static void main(String[] args) {
        SpringApplication.run(SmpApplication.class, args);
    }
}
