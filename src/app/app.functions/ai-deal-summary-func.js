const hubspot = require("@hubspot/api-client");

exports.main = async (context = {}) => {
  const { hs_object_id, ai_summary, ai_summary_generated_at } =
    context.propertiesToSend;

  const { action } = context.parameters;

  console.log(`Action: ${action} for record ${hs_object_id}`);

  // If action is to get existing summary, return it
  if (action === "get_existing") {
    if (ai_summary) {
      return {
        statusCode: 200,
        body: {
          existing_summary: {
            content: ai_summary,
            timestamp: ai_summary_generated_at,
            status: "completed",
            error: null,
          },
        },
      };
    } else {
      return {
        statusCode: 200,
        body: {
          existing_summary: null,
        },
      };
    }
  }

  // If action is to generate new summary
  console.log(`Triggering AI Deal Summary for record ${hs_object_id}`);

  try {
    // Start the AI generation (don't wait for response)
    fetch("https://hook.us2.make.com/ro38kt9bnn7q4glq2is8advh3xasn89d", {
      method: "POST",
      body: JSON.stringify({
        message: "AI Deal Summary request from HubSpot",
        timestamp: new Date().toISOString(),
        recordId: hs_object_id,
        action: "generate_summary",
        // Add a callback URL for when it's done
        callbackUrl: `https://api.hubapi.com/crm/v3/objects/deals/${hs_object_id}`,
        accessToken: process.env.PRIVATE_APP_ACCESS_TOKEN,
      }),
      headers: { "Content-Type": "application/json" },
    });

    // Return immediately that we've started the process
    return {
      statusCode: 200,
      body: {
        webhook: {
          status: "processing",
          recordId: hs_object_id,
          message:
            "AI Deal Summary generation started. Check back in a few minutes.",
          timestamp: new Date().toISOString(),
        },
      },
    };
  } catch (error) {
    console.error("Failed to start AI Deal Summary:", error.message);

    return {
      statusCode: 200,
      body: {
        webhook: {
          status: "error",
          recordId: hs_object_id,
          message: "Failed to start AI Deal Summary generation",
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      },
    };
  }
};
