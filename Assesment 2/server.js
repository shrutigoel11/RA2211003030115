const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;

const BASE_URL = "http://20.244.56.144/test"; // 
const CACHE_TTL = 60 * 1000; 

let usersCache = { data: [], timestamp: 0 };
let postsCache = { data: [], timestamp: 0 };

// Utility function to fetch data with caching
const fetchData = async (url, cacheObj) => {
    const now = Date.now();
    if (now - cacheObj.timestamp < CACHE_TTL) {
        return cacheObj.data; // Return cached data
    }
    try {
        const response = await axios.get(url);
        cacheObj.data = response.data;
        cacheObj.timestamp = now;
        return response.data;
    } catch (error) {
        console.error(`Error fetching ${url}:`, error.message);
        return null;
    }
};

// Get Top 5 Users with Most Posts
app.get("/users", async (req, res) => {
    const users = await fetchData(`${BASE_URL}/users`, usersCache);
    if (!users) return res.status(500).json({ error: "Failed to fetch users" });

    let userPostCounts = [];

    for (const [id, name] of Object.entries(users)) {
        const posts = await fetchData(`${BASE_URL}/users/${id}/posts`, { data: [], timestamp: 0 });
        if (posts) userPostCounts.push({ id, name, postCount: posts.length });
    }

    // Sort by post count (descending) and return top 5
    userPostCounts.sort((a, b) => b.postCount - a.postCount);
    res.json(userPostCounts.slice(0, 5));
});

// Get Top/Latest Posts
app.get("/posts", async (req, res) => {
    const { type } = req.query;
    if (!type || !["popular", "latest"].includes(type)) {
        return res.status(400).json({ error: "Invalid query parameter. Use type=popular or type=latest" });
    }

    const users = await fetchData(`${BASE_URL}/users`, usersCache);
    if (!users) return res.status(500).json({ error: "Failed to fetch users" });

    let allPosts = [];

    for (const id of Object.keys(users)) {
        const posts = await fetchData(`${BASE_URL}/users/${id}/posts`, postsCache);
        if (posts) allPosts.push(...posts);
    }

    if (type === "latest") {
        allPosts.sort((a, b) => b.id - a.id);
        return res.json(allPosts.slice(0, 5));
    }

    if (type === "popular") {
        let postCommentCounts = [];

        for (const post of allPosts) {
            const comments = await fetchData(`${BASE_URL}/posts/${post.id}/comments`, { data: [], timestamp: 0 });
            if (comments) {
                postCommentCounts.push({ post, commentCount: comments.length });
            }
        }

        const maxComments = Math.max(...postCommentCounts.map(p => p.commentCount));
        const popularPosts = postCommentCounts.filter(p => p.commentCount === maxComments).map(p => p.post);

        return res.json(popularPosts);
    }
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
