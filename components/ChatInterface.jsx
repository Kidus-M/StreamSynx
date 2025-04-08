// components/ChatInterface.jsx
import React, { useState, useEffect, useRef } from 'react';
import { rtdb, auth } from '../firebase'; // Adjust path
import { ref, push, serverTimestamp, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { FaPaperPlane } from 'react-icons/fa';
// Removed: import { format } from 'date-fns'; // Was unused in this component
import TimeAgo from 'react-timeago';
// Assuming you have a loading spinner component like react-spinners-kit or similar
// If not, replace <Mosaic /> with a simple text like "Sending..." or install a library
// Example: import { Mosaic } from "react-loading-indicators";
// For now, I'll add a placeholder comment for where the loading component is used.
// You might need to import your actual loading component, e.g.,
// import LoadingSpinner from './LoadingSpinner'; // Or wherever it lives

const ChatInterface = ({ roomId }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const currentUser = auth.currentUser;
    const messagesEndRef = useRef(null); // To auto-scroll

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Fetch messages from RTDB
    useEffect(() => {
        if (!roomId) return;

        const messagesRef = ref(rtdb, `roomChats/${roomId}/messages`);
        // Query to get latest messages, ordered by timestamp
        const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(100)); // Limit history size

        const unsubscribe = onValue(messagesQuery, (snapshot) => {
            const messagesData = [];
            snapshot.forEach((childSnapshot) => {
                messagesData.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val(),
                });
            });
            setMessages(messagesData);
        });

        // Cleanup listener on unmount or roomId change
        return () => unsubscribe();

    }, [roomId]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser || !roomId) return;
        setSending(true);

        const messagesRef = ref(rtdb, `roomChats/${roomId}/messages`);
        try {
            await push(messagesRef, {
                text: newMessage.trim(),
                userId: currentUser.uid,
                username: currentUser.username || 'Anonymous',
                timestamp: serverTimestamp(), // Use server time
            });
            setNewMessage(''); // Clear input after sending
        } catch (error) {
            console.error("Error sending message:", error);
            // Consider adding user feedback, e.g., using react-hot-toast if installed
            // import toast from 'react-hot-toast';
            // toast.error("Failed to send message.");
            alert("Failed to send message."); // Simple fallback
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-secondary rounded-lg shadow-lg h-full flex flex-col max-h-[60vh]"> {/* Adjust max-h as needed */}
            <h3 className="text-lg font-semibold text-textprimary p-3 border-b border-secondary-light">
                Room Chat
            </h3>
            {/* Message Display Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-secondary-light scrollbar-track-secondary">
                {messages.length === 0 && (
                        <p className="text-sm text-textsecondary text-center py-4">No messages yet. Start chatting!</p>
                )}
                {messages.map(msg => {
                    // Ensure timestamp is a valid value for TimeAgo (needs Date object or milliseconds number)
                    // Firebase serverTimestamp might initially be an object, then resolve to a number.
                    // Handle potential null/undefined timestamp during initial load or if data is missing.
                    const timestampDate = typeof msg.timestamp === 'number' ? new Date(msg.timestamp) : null;
                    const isCurrentUser = msg.userId === currentUser?.uid;

                    return (
                        <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] p-2 rounded-lg ${isCurrentUser ? 'bg-accent/30 text-textprimary' : 'bg-secondary-light text-textsecondary'}`}>
                                {!isCurrentUser && (
                                    <p className="text-xs font-semibold text-accent mb-0.5">{msg.username}</p>
                                )}
                                <p className="text-sm break-words">{msg.text}</p>
                                <p className={`text-xs mt-1 ${isCurrentUser ? 'text-textsecondary/70 text-right' : 'text-textsecondary/70'}`}>
                                    {/* Render TimeAgo only if timestampDate is valid */}
                                    {timestampDate ? <TimeAgo date={timestampDate} /> : 'sending...'}
                                </p>
                            </div>
                        </div>
                    );
                })}
                {/* Element to scroll to */}
                <div ref={messagesEndRef} />
            </div>
            {/* Message Input Area */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-secondary-light flex items-center gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={currentUser ? "Type your message..." : "Please log in to chat"}
                    className="flex-1 bg-primary border border-secondary-light rounded-md p-2 text-textprimary focus:ring-accent focus:border-accent placeholder-textsecondary/50 disabled:opacity-50"
                    disabled={!currentUser || sending}
                    maxLength={250}
                />
                <button
                    type="submit"
                    disabled={!currentUser || sending || !newMessage.trim()}
                    className="bg-accent hover:bg-accent-hover text-primary p-2 w-10 h-10 flex items-center justify-center rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed" // Added fixed size for spinner consistency
                    aria-label="Send message"
                >
                    {/* Replace this with your actual loading component or text */}
                    {sending ? <span>...</span> /* <LoadingSpinner size="small" color="#1f2937" /> */ : <FaPaperPlane />}
                </button>
            </form>
        </div>
    );
};

export default ChatInterface;