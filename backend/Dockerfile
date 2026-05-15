# syntax=docker/dockerfile:1.7
FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml ./
COPY smp-common/pom.xml smp-common/pom.xml
COPY smp-platform/pom.xml smp-platform/pom.xml
COPY smp-app/pom.xml smp-app/pom.xml
RUN mvn -q -DskipTests dependency:go-offline
COPY . .
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/smp-app/target/smp-app-*.jar /app/smp-app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/smp-app.jar"]
