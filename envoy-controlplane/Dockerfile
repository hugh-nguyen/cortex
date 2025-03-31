FROM golang:1.21

WORKDIR /app

# Copy certificate and update
COPY ca.crt /usr/local/share/ca-certificates/ca.crt
RUN update-ca-certificates

# Copy go.mod and go.sum, then download modules
COPY go.mod go.sum ./
ENV GONOSUMDB="*"
ENV GOPRIVATE="*"
ENV GOSUMDB="off"
ENV GOINSECURE="*"
RUN go env -w GOPROXY=direct && go mod download

# Now copy the rest of the source code
COPY . ./

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -o xds-server .

EXPOSE 18000 9000
CMD ["./xds-server"]
