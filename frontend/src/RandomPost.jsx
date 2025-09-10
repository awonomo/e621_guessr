import React, { useEffect, useState } from "react";

export default function RandomPost() {
    const [post, setPost] = useState(null);

    useEffect(() => {
        fetch("http://localhost:3001/random-post")
            .then((res) => res.json())
            .then((data) => setPost(data))
            .catch((err) => console.error("Error fetching:", err));
    }, []);

    if (!post) return <p>Loading…</p>;

    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                <div style={{ textAlign: "center" }}>
                    {/* Show sample image if it exists, otherwise full file */}
                    <img
                        src={post.sample?.url || post.file.url}
                        alt={`Post ${post.id}`}
                        style={{
                            maxWidth: "100%",
                            borderRadius: "8px",
                            marginBottom: "1rem",
                        }}
                    />

                    <h2>Post #{post.id}</h2>
                </div>
            </div>

            {/* Display all data from the API call */}
            <pre
                style={{
                    minWidth: "200px",
                    textAlign: "left",
                    backgroundColor: "rgb(1,73,149)",
                    padding: "1rem",
                    borderRadius: "8px",
                    overflowX: "auto",
                    alignSelf: "flex-start"
                }}
            >
                {JSON.stringify(post.tags.general, null, 2)}
            </pre>
        </div>
    );
}
