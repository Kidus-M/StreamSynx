// components/ChatInterface.jsx
import React, { useState, useEffect, useRef } from 'react';
import { rtdb, auth, db } from '../firebase';
import { ref, push, serverTimestamp, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import { FaPaperPlane } from 'react-icons/fa';
import TimeAgo from 'react-timeago';

const ChatInterface = ({ roomId }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [usernameMap, setUsernameMap] = useState({}); // Stores uid -> username mappings
    const currentUser = auth.currentUser;
    const messagesEndRef = useRef(null);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Fetch username for a specific user
    const fetchUsername = async (uid) => {
        if (!uid) return 'Anonymous';
        if (usernameMap[uid]) return usernameMap[uid]; // Return cached username if available

        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                const username = userDoc.data().username || 'Anonymous';
                // Update the username map
                setUsernameMap(prev => ({ ...prev, [uid]: username }));
                return username;
            }
            return 'Anonymous';
        } catch (error) {
            console.error("Error fetching username:", error);
            return 'Anonymous';
        }
    };

    // Fetch messages from RTDB
    useEffect(() => {
        if (!roomId) return;

        const messagesRef = ref(rtdb, `roomChats/${roomId}/messages`);
        const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(100));

        const unsubscribe = onValue(messagesQuery, async (snapshot) => {
            const messagesData = [];
            
            // First collect all messages and unique user IDs
            const userIds = new Set();
            snapshot.forEach((childSnapshot) => {
                const message = {
                    id: childSnapshot.key,
                    ...childSnapshot.val(),
                };
                messagesData.push(message);
                if (message.userId) {
                    userIds.add(message.userId);
                }
            });

            // Fetch usernames for all unique user IDs
            const usernameFetchPromises = Array.from(userIds).map(uid => 
                fetchUsername(uid)
            );
            await Promise.all(usernameFetchPromises);

            // Now set the messages with usernames
            setMessages(messagesData);
        });

        return () => unsubscribe();
    }, [roomId]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser || !roomId) return;
        setSending(true);

        // First get the current user's username from Firestore
        let username = 'Anonymous';
        try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
                username = userDoc.data().username || 'Anonymous';
                // Update username map for current user
                setUsernameMap(prev => ({ ...prev, [currentUser.uid]: username }));
            }
        } catch (error) {
            console.error("Error fetching username:", error);
        }

        const messagesRef = ref(rtdb, `roomChats/${roomId}/messages`);
        try {
            await push(messagesRef, {
                text: newMessage.trim(),
                userId: currentUser.uid,
                username: username,
                timestamp: serverTimestamp(),
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-secondary rounded-lg shadow-lg h-full flex flex-col max-h-[60vh]">
            <h3 className="text-lg font-semibold text-textprimary p-3 border-b border-secondary-light">
                Room Chat
            </h3>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-secondary-light scrollbar-track-secondary">
                {messages.length === 0 && (
                    <p className="text-sm text-textsecondary text-center py-4">No messages yet. Start chatting!</p>
                )}
                {messages.map(msg => {
                    const timestampDate = typeof msg.timestamp === 'number' ? new Date(msg.timestamp) : null;
                    const isCurrentUser = msg.userId === currentUser?.uid;
                    const displayUsername = usernameMap[msg.userId] || msg.username || 'Anonymous';

                    return (
                        <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] p-2 rounded-lg ${isCurrentUser ? 'bg-accent/30 text-textprimary' : 'bg-secondary-light text-textsecondary'}`}>
                                {!isCurrentUser && (
                                    <p className="text-xs font-semibold text-accent mb-0.5">{displayUsername}</p>
                                )}
                                <p className="text-sm break-words">{msg.text}</p>
                                <p className={`text-xs mt-1 ${isCurrentUser ? 'text-textsecondary/70 text-right' : 'text-textsecondary/70'}`}>
                                    {timestampDate ? <TimeAgo date={timestampDate} /> : 'sending...'}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
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
                    className="bg-accent hover:bg-accent-hover text-primary p-2 w-10 h-10 flex items-center justify-center rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Send message"
                >
                    {sending ? <span>...</span> : <FaPaperPlane />}
                </button>
            </form>
        </div>
    );
};

export default ChatInterface;