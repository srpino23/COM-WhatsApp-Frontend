import React, { useEffect, useState, useRef } from "react";
import "./App.css";
import axios from "axios";

function App() {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [image, setImage] = useState(null);
  const [showImagePopup, setShowImagePopup] = useState(false);

  const fetchContacts = async () => {
    try {
      const response = await axios.get(
        "http://172.25.67.77:2400/api/contact/getContacts"
      );
      setContacts(response.data);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  const fetchMessages = async (contactId) => {
    try {
      const response = await axios.get(
        `http://172.25.67.77:2400/api/contact/getContact/${contactId}`
      );
      setSelectedContact((prevContact) => ({
        ...prevContact,
        messages: response.data.messages,
      }));
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    if (selectedContact) {
      const interval = setInterval(
        () => fetchMessages(selectedContact.contactId),
        1000
      );
      return () => clearInterval(interval);
    }
  }, [selectedContact]);

  useEffect(() => {
    scrollToBottom(false);
  }, [selectedContact]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedContact?.messages]);

  const handleSendMessage = async () => {
    if (selectedContact && message.trim()) {
      try {
        await axios.post("http://172.25.67.77:2400/api/message/sendMessage", {
          contactId: selectedContact.contactId,
          message,
        });
        setMessage("");
        fetchMessages(selectedContact.contactId);
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  const handleSendMessageWithImage = async () => {
    if (selectedContact && image) {
      const formData = new FormData();
      formData.append("contactId", selectedContact.contactId);
      formData.append("message", message);
      formData.append("image", image);

      try {
        await axios.post(
          "http://172.25.67.77:2400/api/message/sendMessageWithImage",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        setMessage("");
        setImage(null);
        setShowImagePopup(false);
        fetchMessages(selectedContact.contactId);
      } catch (error) {
        console.error("Error sending message with image:", error);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const scrollToBottom = (smooth = true) => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  const handleScroll = () => {
    if (chatMessagesRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
      if (scrollHeight - scrollTop === clientHeight) {
        setAutoScroll(true);
      } else {
        setAutoScroll(false);
      }
    }
  };

  const handleEmojiClick = (emoji) => {
    setMessage((prevMessage) => prevMessage + emoji);
    setShowEmojiPicker(false);
  };

  const cleanMediaUrl = (url) => {
    return url.split(";")[0];
  };

  const renderMedia = (msg) => {
    if (msg.location && msg.location.latitude && msg.location.longitude) {
      const mapUrl = `https://www.google.com/maps?q=${msg.location.latitude},${msg.location.longitude}&z=15&output=embed`;
      return (
        <div className="chatMapContainer">
          <iframe
            src={mapUrl}
            width="250"
            height="150"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            title="map"
          ></iframe>
        </div>
      );
    }
    if (msg.media) {
      const mediaUrl = cleanMediaUrl(msg.media);
      const mediaType = mediaUrl.split(".").pop();
      if (["jpg", "jpeg", "png", "gif"].includes(mediaType)) {
        return (
          <>
            <img src={mediaUrl} alt="media" className="chatImage" />
            <p>{msg.message}</p>
          </>
        );
      } else if (["mp4", "webm"].includes(mediaType)) {
        return (
          <>
            <video src={mediaUrl} controls className="chatVideo" />
            <p>{msg.message}</p>
          </>
        );
      } else if (["ogg", "mp3"].includes(mediaType)) {
        return (
          <div className="chatAudioContainer">
            <audio
              src={mediaUrl}
              controls
              className="chatAudio"
              type={`audio/${mediaType}`}
              onEnded={(e) => e.target.load()}
            >
              Tu navegador no soporta el elemento de audio.
            </audio>
          </div>
        );
      }
    }
    return <p>{msg.message}</p>;
  };

  return (
    <div className="container">
      <div className="smallBlock">Total de mensajes hoy</div>
      <div className="smallBlock">Total de usuarios activos hoy</div>
      <div className="smallBlock">Métrica inventada</div>
      <div className="listBlock">
        <div className="listHeader">
          <h2>Contactos</h2>
          <input type="text" placeholder="Buscar..." />
        </div>
        <div className="contactList">
          {contacts.map((contact) => (
            <div
              key={contact._id}
              className="contactItem"
              onClick={() => {
                setSelectedContact(contact);
                fetchMessages(contact.contactId);
              }}
            >
              <div className="contactPhoto">
                {contact.name ? contact.name[0] : ""}
              </div>
              <div className="contactInfo">
                <div className="contactName">{contact.name}</div>
                <div className="contactPhone">{contact.phoneNumber}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="chatBlock">
        {selectedContact ? (
          <>
            <div className="chatHeader">
              <div className="contactPhoto">
                {selectedContact.name ? selectedContact.name[0] : ""}
              </div>
              <div className="contactName">{selectedContact.name}</div>
            </div>
            <div
              className="chatMessages"
              ref={chatMessagesRef}
              onScroll={handleScroll}
            >
              {selectedContact.messages.map((msg, index) => (
                <div key={index} className={`chatMessage ${msg.from}`}>
                  {renderMedia(msg)}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="chatInput">
              <button
                className="emojiButton"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                😊
              </button>
              <button
                className="imageButton"
                onClick={() => setShowImagePopup(true)}
              >
                📎
              </button>
              {showEmojiPicker && (
                <div className="emojiPicker">
                  {["😀", "😂", "😍", "😎", "😭", "😡"].map((emoji) => (
                    <span
                      key={emoji}
                      className="emoji"
                      onClick={() => handleEmojiClick(emoji)}
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              )}
              {showImagePopup && (
                <div className="imagePopup">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImage(e.target.files[0])}
                  />
                  <input
                    type="text"
                    placeholder="Escribe un mensaje..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <button onClick={handleSendMessageWithImage}>Enviar</button>
                  <button onClick={() => setShowImagePopup(false)}>
                    Cancelar
                  </button>
                </div>
              )}
              <input
                type="text"
                placeholder="Escribe un mensaje..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button onClick={handleSendMessage}>Enviar</button>
            </div>
          </>
        ) : (
          <div className="chatEmpty">
            <p>Selecciona un contacto</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
