import {
  hubspot,
  Button,
  Text,
  Divider,
  Flex,
  Tag,
} from "@hubspot/ui-extensions";
import { useState } from "react";

hubspot.extend(() => <AiDealSummaryCard />);

const AiDealSummaryCard = () => {
  const [webhookResult, setWebhookResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const triggerWebhook = async () => {
    setLoading(true);
    setProgress(0);
    setElapsedTime(0);
    setWebhookResult(null);

    const startTime = Date.now();

    // Simulate progress updates and show elapsed time
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 1.5, 95)); // Slower progress increment
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const result = await hubspot.serverless("n8n-webhook", {
        propertiesToSend: ["hs_object_id"],
        parameters: {},
      });

      console.log("AI Analysis result:", result);
      setWebhookResult(result.body.webhook);
      setProgress(100);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      setWebhookResult({
        status: "error",
        message: "Failed to generate AI analysis",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setTimeout(() => {
        setProgress(0);
        setElapsedTime(0);
      }, 3000); // Reset after 3 seconds
    }
  };

  return (
    <Flex direction="column" gap="medium">
      <Flex direction="row" justify="between" align="center">
        <Text format={{ fontWeight: "bold", fontSize: "large" }}>
          Never miss a deal again
        </Text>
        {webhookResult && (
          <Tag
            variant={webhookResult.status === "success" ? "success" : "error"}
          >
            {webhookResult.status}
          </Tag>
        )}
      </Flex>

      <Divider />

      <Button onClick={triggerWebhook} disabled={loading} variant="primary">
        {loading ? "Generating AI Deal Summary..." : "Generate AI Deal Summary"}
      </Button>

      {loading && (
        <Flex direction="column" gap="small">
          <Text format={{ fontSize: "small", color: "secondary" }}>
            🤖 AI is analyzing your deal... This may take up to 60 seconds.
          </Text>

          {/* Simple progress indicator */}
          <Flex direction="row" gap="small" align="center">
            <Text format={{ fontSize: "small" }}>Progress:</Text>
            <Flex direction="row" gap="xsmall">
              {[...Array(10)].map((_, i) => (
                <Text
                  key={i}
                  format={{
                    color: progress > i * 10 ? "primary" : "secondary",
                  }}
                >
                  ●
                </Text>
              ))}
            </Flex>
            <Text format={{ fontSize: "small" }}>{Math.floor(progress)}%</Text>
          </Flex>

          <Text format={{ fontSize: "small", color: "secondary" }}>
            {progress < 95
              ? `Processing... ${elapsedTime}s elapsed`
              : `Almost done... ${elapsedTime}s elapsed`}
          </Text>
        </Flex>
      )}

      {webhookResult && !loading && (
        <>
          <Divider />

          <Flex direction="column" gap="small">
            <Text format={{ fontWeight: "bold" }}>AI Analysis Result:</Text>

            {webhookResult.status === "success" && webhookResult.response && (
              <Flex direction="column" gap="small">
                {/* Display the AI response content */}
                <Text>
                  {typeof webhookResult.response === "string"
                    ? webhookResult.response
                    : webhookResult.response.analysis ||
                      webhookResult.response.content ||
                      webhookResult.response.text ||
                      JSON.stringify(webhookResult.response, null, 2)}
                </Text>
              </Flex>
            )}

            {webhookResult.status === "success" && !webhookResult.response && (
              <Text>{webhookResult.message}</Text>
            )}

            {webhookResult.error && (
              <>
                <Text format={{ fontWeight: "bold", color: "red" }}>
                  Error:
                </Text>
                <Text format={{ color: "red" }}>{webhookResult.error}</Text>
              </>
            )}

            <Text
              format={{
                fontSize: "small",
                color: "secondary",
                marginTop: "medium",
              }}
            >
              Generated: {new Date(webhookResult.timestamp).toLocaleString()}
            </Text>
          </Flex>
        </>
      )}

      {!webhookResult && !loading && (
        <Text
          format={{
            fontSize: "small",
            color: "secondary",
            textAlign: "center",
          }}
        >
          Click the button above to generate an AI-powered deal summary.
        </Text>
      )}
    </Flex>
  );
};
