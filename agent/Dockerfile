FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod ./
COPY main.go ./
RUN CGO_ENABLED=0 go build -o mspdoku-agent .

FROM alpine:3.19
COPY --from=build /app/mspdoku-agent /usr/local/bin/mspdoku-agent
ENTRYPOINT ["mspdoku-agent"]
