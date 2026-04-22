import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Card,
  CardContent,
  CardHeader,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { SqsMessage } from "../types";
import { JSONTree } from "react-json-tree";

const toLocaleString = (epochTimeStamp: string) => {
  return new Date(parseInt(epochTimeStamp)).toLocaleString();
};

const getJsonOrRawData = (str: string) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
};

const MessageItem = (props: { data: SqsMessage }) => {
  return (
    <>
      <Card>
        <CardHeader
          title={`MessageId: ${props.data.messageId}`}
          subheader={`Sent on: ${toLocaleString(
            // @ts-ignore
            props.data.messageAttributes.SentTimestamp,
          )}, Received at: ${toLocaleString(
            // @ts-ignore
            props.data.messageAttributes.ApproximateFirstReceiveTimestamp,
          )}
          ${
            props.data.messageAttributes?.MessageGroupId
              ? `, MessageGroupId: ${props.data.messageAttributes?.MessageGroupId},
              DeduplicationId: ${props.data.messageAttributes?.MessageDeduplicationId}`
              : ""
          }
          `}
        />
        <CardContent>
          {props.data.customAttributes && Object.keys(props.data.customAttributes).length > 0 ? (
            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="panel1a-content"
                id="panel1a-header"
              >
                <Typography>Message Attributes</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <JSONTree
                  data={props.data.customAttributes}
                  keyPath={["attributes"]}
                />
              </AccordionDetails>
            </Accordion>
          ) : null}

          <Accordion expanded={true}>
            <AccordionDetails sx={{ pt: 1, pb: 1 }}>
              <JSONTree
                data={getJsonOrRawData(props.data.messageBody)}
                keyPath={["message"]}
              />
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>
    </>
  );
};

export default MessageItem;
