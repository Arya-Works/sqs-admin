package types

type SqsQueue struct {
	QueueUrl        string
	QueueName       string
	QueueAttributes *map[string]string
}

type SqsMessage struct {
	MessageId         string            `json:"messageId"`
	MessageBody       string            `json:"messageBody"`
	MessageAttributes map[string]string `json:"messageAttributes"`
	CustomAttributes  map[string]string `json:"customAttributes,omitempty"`
	ReceiptHandle     string            `json:"receiptHandle"`
}

type Request struct {
	Action     string     `json:"action"`
	SqsQueue   SqsQueue   `json:"queue"`
	SqsMessage SqsMessage `json:"message"`
}

type AwsRegion struct {
	Region string `json:"region"`
}
