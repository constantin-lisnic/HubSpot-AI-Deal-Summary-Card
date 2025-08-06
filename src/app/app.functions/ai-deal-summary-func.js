exports.main = async (context = {}) => {
  const { hs_object_id } = context.propertiesToSend;
  console.log(`Triggering AI Deal Summary for record ${hs_object_id}`);

  try {
    const response = await fetch(
      "https://hook.us2.make.com/ro38kt9bnn7q4glq2is8advh3xasn89d",
      {
        method: "POST",
        body: JSON.stringify({
          message: "AI Deal Summary request from HubSpot",
          timestamp: new Date().toISOString(),
          recordId: hs_object_id,
          action: "generate_summary",
        }),
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Webhook call failed with status: ${response.status}`);
    }

    // Get the response from webhook (which includes LLM output)
    const webhookData = await response.json();
    console.log(`AI Deal Summary completed for record ${hs_object_id}`);

    return {
      statusCode: 200,
      body: {
        webhook: {
          status: "success",
          recordId: hs_object_id,
          message: "AI Deal Summary completed successfully",
          response: webhookData,
          timestamp: new Date().toISOString(),
        },
      },
    };
  } catch (error) {
    console.error("AI Deal Summary failed:", error.message);

    return {
      statusCode: 200,
      body: {
        webhook: {
          status: "error",
          recordId: hs_object_id,
          message: "Failed to generate AI Deal Summary",
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      },
    };
  }
};
