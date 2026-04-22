package aws

import (
	"context"
	"crypto/tls"
	"net/http"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/pacoVK/utils"
)

func buildClient(region string) *sqs.Client {
	cfgOpts := []func(*config.LoadOptions) error{
		config.WithRegion(region),
	}
	var clientOpts []func(*sqs.Options)

	// SQS_ENDPOINT_URL set → always LocalStack (overrides credential detection).
	// SQS_ENDPOINT_URL unset + no AWS creds → LocalStack at default localhost:4566.
	// SQS_ENDPOINT_URL unset + AWS creds present → real AWS, default credential chain.
	endpointURL := os.Getenv("SQS_ENDPOINT_URL")
	useLocalStack := endpointURL != "" || os.Getenv("AWS_ACCESS_KEY_ID") == ""

	if useLocalStack {
		if endpointURL == "" {
			endpointURL = "http://localhost:4566"
		}
		cfgOpts = append(cfgOpts,
			config.WithCredentialsProvider(
				credentials.NewStaticCredentialsProvider("ACCESS_KEY", "SECRET_KEY", "TOKEN"),
			),
			// LocalStack uses a self-signed TLS cert — skip verification.
			config.WithHTTPClient(&http.Client{
				Transport: &http.Transport{
					TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, //nolint:gosec
				},
			}),
		)
		clientOpts = append(clientOpts, func(o *sqs.Options) {
			o.BaseEndpoint = aws.String(endpointURL)
		})
	}

	cfg, _ := config.LoadDefaultConfig(context.TODO(), cfgOpts...)
	return sqs.NewFromConfig(cfg, clientOpts...)
}

var sqsClient = buildClient(utils.GetEnv("SQS_AWS_REGION", "eu-central-1"))

func SetRegion(region string) {
	sqsClient = buildClient(region)
}
