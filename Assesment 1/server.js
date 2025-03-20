const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 9876;
const WINDOW_SIZE = 10;
const TIMEOUT = 500;

const cache = [];

// API Credentials
const AUTH_URL = "http://20.244.56.144/test/auth";
const NUMBER_APIS = {
    p: "http://20.244.56.144/test/primes",
    f: "http://20.244.56.144/test/fibo",
    e: "http://20.244.56.144/test/even",
    r: "http://20.244.56.144/test/rand",
};

const CLIENT_ID = "37bb493c-73d3-47ea-8675-21f66ef9b735";
const CLIENT_SECRET = "HVIQBVbqmTGEmaED";
const COMPANY_NAME = "goMart";
const OWNER_NAME = "Rahul";
const OWNER_EMAIL = "rahul@abc.edu";
const ROLL_NO = "1";

let accessToken = null;

// Function to get the authorization token
const getAuthToken = async () => {
    try {
        const response = await axios.post(AUTH_URL, {
            companyName: COMPANY_NAME,
            clientID: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            ownerName: OWNER_NAME,
            ownerEmail: OWNER_EMAIL,
            rollNo: ROLL_NO,
        });

        accessToken = response.data["access token"];
        console.log("Access Token Obtained:", accessToken);
    } catch (error) {
        console.error("Error obtaining auth token:", error.message);
    }
};

// Fetch numbers from third-party API with authorization
const fetchNumbers = async (url) => {
    try {
        if (!accessToken) {
            console.log("Fetching new access token...");
            await getAuthToken();
        }

        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: TIMEOUT,
        });

        console.log("API Response:", response.data);
        return Array.isArray(response.data.numbers) ? response.data.numbers : [];
    } catch (error) {
        console.error(`Error fetching numbers from ${url}:`, error.message);
        return [];
    }
};

// API Route
app.get("/numbers/:numberid", async (req, res) => {
    const { numberid } = req.params;

    if (!NUMBER_APIS[numberid]) {
        return res.status(400).json({ error: "Invalid number ID" });
    }

    // Capture the previous state of the cache
    const prevState = [...cache];

    // Fetch new numbers from API
    const newNumbers = await fetchNumbers(NUMBER_APIS[numberid]);

    // Remove duplicates
    const uniqueNumbers = [...new Set(newNumbers)];

    // Maintain window size (FIFO policy)
    cache.push(...uniqueNumbers);
    while (cache.length > WINDOW_SIZE) {
        cache.shift();
    }

    // Calculate average
    const avg = cache.length > 0
        ? cache.reduce((sum, num) => sum + num, 0) / cache.length
        : 0;

    // Response format
    res.json({
        windowPrevState: prevState,
        windowCurrState: [...cache],
        numbers: uniqueNumbers,
        avg: avg.toFixed(2),
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
