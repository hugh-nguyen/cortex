FROM golang:1.21

WORKDIR /app

COPY go.mod go.sum ./
ENV GONOSUMDB="*"
ENV GOPRIVATE="*"
ENV GOSUMDB="off"
ENV GOINSECURE="*"
RUN go env -w GOPROXY=direct && go mod download

COPY . ./

RUN CGO_ENABLED=0 GOOS=linux go build -o xds-server .

EXPOSE 18000 9000
CMD ["./xds-server"]
