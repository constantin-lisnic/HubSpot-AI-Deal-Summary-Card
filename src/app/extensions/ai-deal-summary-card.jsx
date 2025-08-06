import {
  hubspot,
  Button,
  Text,
  Divider,
  Flex,
  Tag,
} from "@hubspot/ui-extensions";
import { useState, useEffect } from "react";

hubspot.extend(() => <AiDealSummaryCard />);

const AiDealSummaryCard = () => {
  const [webhookResult, setWebhookResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [savedSummary, setSavedSummary] = useState(null);
  const [loadingSavedSummary, setLoadingSavedSummary] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Parse AI summary content
  const parseAISummary = (content) => {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content);
      return parsed;
    } catch (error) {
      // If not JSON, return as plain text
      return { content: content };
    }
  };

  // Render structured AI summary
  const renderAISummary = (content) => {
    const parsed = parseAISummary(content);

    // If it's not structured data, show as plain text
    if (parsed.content) {
      return <Text>{parsed.content}</Text>;
    }

    // Render structured sections
    return (
      <Flex direction="column" gap="medium">
        {parsed.lead_introduction && (
          <Flex direction="column" gap="small">
            <Text format={{ fontWeight: "bold", fontSize: "medium" }}>
              👤 Lead Introduction
            </Text>
            <Text>{parsed.lead_introduction}</Text>
          </Flex>
        )}

        {parsed.engagement_summary && (
          <Flex direction="column" gap="small">
            <Text format={{ fontWeight: "bold", fontSize: "medium" }}>
              📞 Engagement Summary
            </Text>
            <Text>{parsed.engagement_summary}</Text>
          </Flex>
        )}

        {parsed.technical_needs && (
          <Flex direction="column" gap="small">
            <Text format={{ fontWeight: "bold", fontSize: "medium" }}>
              ⚙️ Technical Needs
            </Text>
            <Text>{parsed.technical_needs}</Text>
          </Flex>
        )}

        {parsed.current_deal_status && (
          <Flex direction="column" gap="small">
            <Text format={{ fontWeight: "bold", fontSize: "medium" }}>
              📊 Current Deal Status
            </Text>
            <Text>{parsed.current_deal_status}</Text>
          </Flex>
        )}

        {parsed.open_sales_actions && (
          <Flex direction="column" gap="small">
            <Text format={{ fontWeight: "bold", fontSize: "medium" }}>
              🎯 Recommended Actions
            </Text>
            <Text style={{ whiteSpace: "pre-line" }}>
              {parsed.open_sales_actions}
            </Text>
          </Flex>
        )}

        {parsed.key_dates_timeline && (
          <Flex direction="column" gap="small">
            <Text format={{ fontWeight: "bold", fontSize: "medium" }}>
              📅 Key Timeline
            </Text>
            <Text style={{ whiteSpace: "pre-line" }}>
              {parsed.key_dates_timeline}
            </Text>
          </Flex>
        )}

        {parsed.tldr && (
          <Flex direction="column" gap="small">
            <Text format={{ fontWeight: "bold", fontSize: "medium" }}>
              ⚡ TL;DR
            </Text>
            <Text format={{ fontStyle: "italic" }}>{parsed.tldr}</Text>
          </Flex>
        )}
      </Flex>
    );
  };

  // Load existing AI summary by calling serverless function to get properties
  useEffect(() => {
    const loadSavedSummary = async () => {
      try {
        setLoadingSavedSummary(true);

        // Call serverless function to get existing properties
        const result = await hubspot.serverless("ai-deal-summary-func", {
          propertiesToSend: [
            "hs_object_id",
            "ai_summary",
            "ai_summary_generated_at",
          ],
          parameters: { action: "get_existing" },
        });

        console.log("Loaded existing summary:", result);

        if (result.body.existing_summary) {
          setSavedSummary(result.body.existing_summary);
        }
      } catch (error) {
        console.error("Failed to load saved AI summary:", error);
      } finally {
        setLoadingSavedSummary(false);
      }
    };

    loadSavedSummary();
  }, []);

  const pollForUpdates = (originalTimestamp) => {
    let pollCount = 0;
    const maxPolls = 60; // Poll for up to 5 minutes (every 5 seconds)

    const pollInterval = setInterval(async () => {
      pollCount++;
      console.log(`Polling attempt ${pollCount}...`);

      try {
        const result = await hubspot.serverless("ai-deal-summary-func", {
          propertiesToSend: [
            "hs_object_id",
            "ai_summary",
            "ai_summary_generated_at",
          ],
          parameters: { action: "get_existing" },
        });

        if (
          result.body.existing_summary &&
          result.body.existing_summary.timestamp !== originalTimestamp
        ) {
          // New summary is available!
          console.log("New summary detected!");
          setSavedSummary(result.body.existing_summary);
          setWebhookResult({
            status: "success",
            message: "AI Deal Summary completed successfully",
            timestamp: result.body.existing_summary.timestamp,
            saved_to_crm: true,
          });
          setIsProcessing(false);
          setProgress(100);
          clearInterval(pollInterval);

          // Clear the result after 3 seconds
          setTimeout(() => {
            setWebhookResult(null);
            setProgress(0);
            setElapsedTime(0);
          }, 3000);
        }

        // Stop polling if we've reached max attempts
        if (pollCount >= maxPolls) {
          console.log("Max polling attempts reached");
          setIsProcessing(false);
          setWebhookResult({
            status: "timeout",
            message:
              "AI generation is taking longer than expected. Please check back later.",
            timestamp: new Date().toISOString(),
          });
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 5000); // Poll every 5 seconds

    return pollInterval;
  };

  const triggerWebhook = async () => {
    setLoading(true);
    setProgress(0);
    setElapsedTime(0);
    setWebhookResult(null);
    setIsProcessing(true);

    const startTime = Date.now();
    const originalTimestamp = savedSummary?.timestamp;

    // Simulate progress updates and show elapsed time
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 0.5, 90)); // Slower progress, cap at 90%
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const result = await hubspot.serverless("ai-deal-summary-func", {
        propertiesToSend: [
          "hs_object_id",
          "ai_summary",
          "ai_summary_generated_at",
        ],
        parameters: { action: "generate_new" },
      });

      console.log("AI Analysis result:", result);

      if (result.body.webhook.status === "processing") {
        // Show processing status and start polling
        setWebhookResult({
          status: "processing",
          message: "AI generation started. Waiting for completion...",
          timestamp: new Date().toISOString(),
        });

        // Start polling for updates
        pollForUpdates(originalTimestamp);
      } else if (result.body.webhook.status === "success") {
        // Immediate success (shouldn't happen with async processing)
        setWebhookResult(result.body.webhook);
        setProgress(100);
        setIsProcessing(false);

        if (result.body.updated_summary) {
          setSavedSummary(result.body.updated_summary);
        }
      } else {
        // Error case
        setWebhookResult(result.body.webhook);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("AI Analysis failed:", error);
      setWebhookResult({
        status: "error",
        message: "Failed to start AI analysis",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      setIsProcessing(false);
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
    }
  };

  if (loadingSavedSummary) {
    return (
      <Flex direction="column" gap="medium">
        <Text format={{ fontSize: "small", color: "secondary" }}>
          Loading saved summary...
        </Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="medium">
      {/* Show saved summary if it exists */}
      {savedSummary && !loading && !isProcessing && (
        <Flex direction="column" gap="small">
          <Flex direction="row" justify="between" align="center">
            <Text format={{ fontWeight: "bold" }}>Saved AI Analysis:</Text>
            <Text format={{ fontSize: "small", color: "secondary" }}>
              {savedSummary.timestamp
                ? new Date(savedSummary.timestamp).toLocaleString()
                : "Unknown date"}
            </Text>
          </Flex>

          {renderAISummary(savedSummary.content)}

          <Divider />
        </Flex>
      )}

      {/* Show status tag for current operations */}
      {webhookResult && (
        <Flex direction="row" justify="center">
          <Tag
            variant={
              webhookResult.status === "success"
                ? "success"
                : webhookResult.status === "processing"
                ? "warning"
                : "error"
            }
          >
            {webhookResult.status === "processing"
              ? "generating..."
              : webhookResult.status}
          </Tag>
        </Flex>
      )}

      <Button
        onClick={triggerWebhook}
        disabled={loading || isProcessing}
        variant="primary"
      >
        {loading || isProcessing
          ? "Generating AI Summary..."
          : savedSummary
          ? "Generate New AI Summary"
          : "Generate AI Deal Summary"}
      </Button>

      {(loading || isProcessing) && (
        <Flex direction="column" gap="small">
          <Text format={{ fontSize: "small", color: "secondary" }}>
            {isProcessing
              ? "🤖 AI is analyzing your deal... This may take a few minutes."
              : "🤖 Starting AI analysis..."}
          </Text>
        </Flex>
      )}

      {webhookResult && !loading && !isProcessing && (
        <>
          <Divider />

          <Flex direction="column" gap="small">
            <Text format={{ fontWeight: "bold" }}>
              Latest Generation Result:
            </Text>

            {webhookResult.status === "success" && (
              <Flex direction="column" gap="small">
                <Text>✅ AI summary generated and saved successfully!</Text>
                {webhookResult.saved_to_crm && (
                  <Text format={{ fontSize: "small", color: "success" }}>
                    Summary saved to deal record
                  </Text>
                )}
              </Flex>
            )}

            {webhookResult.status === "timeout" && (
              <Text format={{ color: "orange" }}>{webhookResult.message}</Text>
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
              {webhookResult.timestamp &&
                `Generated: ${new Date(
                  webhookResult.timestamp
                ).toLocaleString()}`}
            </Text>
          </Flex>
        </>
      )}

      {!webhookResult && !loading && !savedSummary && !isProcessing && (
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
