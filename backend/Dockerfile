FROM gradle:8.5-jdk21 AS builder
WORKDIR /app
COPY --chown=gradle:gradle . .
# Skip tests to speed up build and avoid test failures due to missing env
RUN gradle build -x test --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
