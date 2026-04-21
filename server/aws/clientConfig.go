package aws

import (
	"context"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/pacoVK/utils"
)

func buildClient(region string) *sqs.Client {
	resolver := aws.EndpointResolverWithOptionsFunc(func(service, reg string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			PartitionID:   "aws",
			URL:           utils.GetEnv("SQS_ENDPOINT_URL", "http://localhost:4566"),
			SigningRegion: region,
		}, nil
	})
	cfg, _ := config.LoadDefaultConfig(context.TODO(),
		config.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider("ACCESS_KEY", "SECRET_KEY", "TOKEN"),
		),
		config.WithEndpointResolverWithOptions(resolver),
		config.WithRegion(region),
	)
	return sqs.NewFromConfig(cfg)
}

var sqsClient = buildClient(utils.GetEnv("SQS_AWS_REGION", "eu-central-1"))

func SetRegion(region string) {
	sqsClient = buildClient(region)
}
