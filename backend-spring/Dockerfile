# Minimal Runtime image using Eclipse Temurin Java 21
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy the pre-built Spring Boot executable JAR directly
# This eliminates Docker build DNS timeouts and downloads (mvn dependency:go-offline)
COPY target/platform-1.0.0.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

