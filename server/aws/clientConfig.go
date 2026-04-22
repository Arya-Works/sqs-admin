package aws

import (
	"context"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/pacoVK/utils"
)

func buildClient(region string) *sqs.Client {
	opts := []func(*config.LoadOptions) error{
		config.WithRegion(region),
	}

	if os.Getenv("AWS_ACCESS_KEY_ID") == "" {
		// No AWS credentials — default to LocalStack
		endpointURL := utils.GetEnv("SQS_ENDPOINT_URL", "http://localhost:4566")
		resolver := aws.EndpointResolverWithOptionsFunc(func(service, reg string, options ...interface{}) (aws.Endpoint, error) {
			return aws.Endpoint{
				PartitionID:   "aws",
				URL:           endpointURL,
				SigningRegion: region,
			}, nil
		})
		opts = append(opts,
			config.WithCredentialsProvider(
				credentials.NewStaticCredentialsProvider("ACCESS_KEY", "SECRET_KEY", "TOKEN"),
			),
			config.WithEndpointResolverWithOptions(resolver),
		)
	}
	// AWS_ACCESS_KEY_ID set — SDK uses default credential chain with real AWS endpoints.

	cfg, _ := config.LoadDefaultConfig(context.TODO(), opts...)
	return sqs.NewFromConfig(cfg)
}

var sqsClient = buildClient(utils.GetEnv("SQS_AWS_REGION", "eu-central-1"))

func SetRegion(region string) {
	sqsClient = buildClient(region)
}
