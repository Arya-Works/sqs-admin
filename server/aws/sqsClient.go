package aws

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/aws/aws-sdk-go-v2/service/sqs"
	awsTypes "github.com/aws/aws-sdk-go-v2/service/sqs/types"
	"github.com/google/uuid"

	"github.com/pacoVK/aws/types"
)

func getQueues() (*sqs.ListQueuesOutput, error) {
	return sqsClient.ListQueues(context.TODO(), &sqs.ListQueuesInput{})
}

func getQueueAttributes(queueUrl *string) (*sqs.GetQueueAttributesOutput, error) {
	return sqsClient.GetQueueAttributes(context.TODO(), &sqs.GetQueueAttributesInput{
		QueueUrl:       queueUrl,
		AttributeNames: []awsTypes.QueueAttributeName{awsTypes.QueueAttributeNameAll},
	})
}

func ListQueues() []types.SqsQueue {
	var queues = make([]types.SqsQueue, 0)
	result, err := getQueues()
	if err != nil {
		log.Printf("Got an error retrieving queue URLs: %v", err.Error())
		return queues
	}
	for _, url := range result.QueueUrls {
		attributes, err := getQueueAttributes(&url)
		if err != nil {
			log.Printf("Got an error retrieving queue Attributes: %v", err.Error())
			return queues
		}
		arnParts := strings.Split(attributes.Attributes["QueueArn"], ":")
		queues = append(queues, types.SqsQueue{
			QueueUrl:        url,
			QueueAttributes: &attributes.Attributes,
			QueueName:       arnParts[len(arnParts)-1],
		})
	}
	return queues
}

func receiveMessages(queueUrl *string) (*sqs.ReceiveMessageOutput, error) {
	return sqsClient.ReceiveMessage(context.TODO(), &sqs.ReceiveMessageInput{
		QueueUrl:              queueUrl,
		AttributeNames:        []awsTypes.QueueAttributeName{awsTypes.QueueAttributeNameAll},
		MessageAttributeNames: []string{"All"},
		VisibilityTimeout:     30,
		MaxNumberOfMessages:   10,
		WaitTimeSeconds:       1,
	})
}

func GetMessages(queueUrl string) ([]types.SqsMessage, error) {
	var sqsMessages = make([]types.SqsMessage, 0)
	messages, err := receiveMessages(&queueUrl)
	if err != nil {
		return nil, err
	}
	for _, message := range messages.Messages {
		customAttrs := make(map[string]string)
		for key, val := range message.MessageAttributes {
			if val.StringValue != nil {
				customAttrs[key] = *val.StringValue
			}
		}

		if message.ReceiptHandle == nil {
			log.Printf("Warning: message %v has nil ReceiptHandle, skipping", *message.MessageId)
			continue
		}

		sqsMessages = append(sqsMessages, types.SqsMessage{
			MessageId:         *message.MessageId,
			MessageBody:       *message.Body,
			MessageAttributes: message.Attributes,
			CustomAttributes:  customAttrs,
			ReceiptHandle:     *message.ReceiptHandle,
		})
	}
	return sqsMessages, nil
}

func PurgeQueue(queueUrl string) (*sqs.PurgeQueueOutput, error) {
	return sqsClient.PurgeQueue(context.TODO(), &sqs.PurgeQueueInput{
		QueueUrl: &queueUrl,
	})
}

func DeleteQueue(queueUrl string) (*sqs.DeleteQueueOutput, error) {
	return sqsClient.DeleteQueue(context.TODO(), &sqs.DeleteQueueInput{
		QueueUrl: &queueUrl,
	})
}

func DeleteMessage(queueUrl string, receiptHandle string) (*sqs.DeleteMessageOutput, error) {
	return sqsClient.DeleteMessage(context.TODO(), &sqs.DeleteMessageInput{
		QueueUrl:      &queueUrl,
		ReceiptHandle: &receiptHandle,
	})
}

func CreateQueue(queueName string, attributes *map[string]string) (*sqs.CreateQueueOutput, error) {
	return sqsClient.CreateQueue(context.TODO(), &sqs.CreateQueueInput{
		QueueName:  &queueName,
		Attributes: *attributes,
	})
}

func SendMessage(queueUrl string, sqsMessage types.SqsMessage) (*sqs.SendMessageOutput, error) {
	messageGroupId, hasMessageGroupId := sqsMessage.MessageAttributes["MessageGroupId"]
	customAttributes, hasCustomAttributes := sqsMessage.MessageAttributes["CustomAttributes"]

	sendMessageInput := sqs.SendMessageInput{
		QueueUrl:    &queueUrl,
		MessageBody: &sqsMessage.MessageBody,
	}
	if hasMessageGroupId {
		messageDeduplicationId := uuid.NewString()
		sendMessageInput.MessageDeduplicationId = &messageDeduplicationId
		sendMessageInput.MessageGroupId = &messageGroupId
	}
	if hasCustomAttributes {
		attributeValues := buildMessageAttributesFromString(customAttributes)
		sendMessageInput.MessageAttributes = attributeValues
	}
	return sqsClient.SendMessage(context.TODO(), &sendMessageInput)
}

func buildMessageAttributesFromString(customAttributes string) map[string]awsTypes.MessageAttributeValue {
	attributeValues := make(map[string]awsTypes.MessageAttributeValue)
	var attributeMap map[string]string
	err := json.Unmarshal([]byte(customAttributes), &attributeMap)
	if err != nil {
		fmt.Println("Error parsing JSON:", err)
	}

	stringDataType := "String"

	// Iterate over the attribute map and add each key-value pair to the map
	for key, value := range attributeMap {
		attributeValues[key] = awsTypes.MessageAttributeValue{
			DataType:    &stringDataType,
			StringValue: &value,
		}
	}
	return attributeValues
}
