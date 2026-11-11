const { createCompletion, MODEL } = require("./nvidia.js");

async function testNvidia() {
  try {
    console.log("Testing NVIDIA API...");
    console.log("Model:", MODEL);

    const response = await createCompletion({
      messages: [
        {
          role: "user",
          content: "Explain what a web search agent does in two sentences.",
        },
      ],
    });

    console.log("\nResponse:");
    console.log(response.choices[0].message.content);

    console.log("\nFinish reason:");
    console.log(response.choices[0].finish_reason);

    console.log("\nNVIDIA integration successful!");
  } catch (error) {
    console.error("NVIDIA integration failed:");
    console.error(error.status || error.message);
    console.error(error.error || "");
    process.exitCode = 1;
  }
}

testNvidia();
