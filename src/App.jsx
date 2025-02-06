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
  const [alertContacts, setAlertContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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
    const interval = setInterval(fetchContacts, 1000);
    return () => clearInterval(interval);
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
        setIsLoading(true); // Mostrar efecto de carga
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
        setTimeout(() => fetchMessages(selectedContact.contactId), 1000);
      } catch (error) {
        console.error("Error sending message with image:", error);
      } finally {
        setIsLoading(false); // Ocultar efecto de carga
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      if (autoScroll) {
        messagesEndRef.current?.scrollIntoView({
          behavior: smooth ? "smooth" : "auto",
        });
      }
    }, 50);
  };

  const handleScroll = () => {
    if (chatMessagesRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
      setAutoScroll(scrollHeight - scrollTop === clientHeight);
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
            {msg.message && <p>{msg.message}</p>}
          </>
        );
      } else if (["mp4", "webm"].includes(mediaType)) {
        return (
          <>
            <video src={mediaUrl} controls className="chatVideo" />
            {msg.message && <p>{msg.message}</p>}
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

  const toggleAlertContact = (contactId) => {
    setAlertContacts((prevAlertContacts) => {
      if (prevAlertContacts.includes(contactId)) {
        return prevAlertContacts.filter((id) => id !== contactId);
      } else {
        return [...prevAlertContacts, contactId];
      }
    });
  };

  const sortedContacts = [...contacts].sort((a, b) => {
    if (
      alertContacts.includes(a.contactId) &&
      !alertContacts.includes(b.contactId)
    ) {
      return -1;
    }
    if (
      !alertContacts.includes(a.contactId) &&
      alertContacts.includes(b.contactId)
    ) {
      return 1;
    }
    return 0;
  });

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
          {sortedContacts.map((contact) => (
            <div
              key={contact._id}
              className={`contactItem ${
                alertContacts.includes(contact.contactId) ? "alert" : ""
              }`}
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
              <button
                className="alertButton"
                onClick={() => toggleAlertContact(contact.contactId)}
              >
                {alertContacts.includes(contact.contactId)
                  ? "Quitar alerta"
                  : "Poner en alerta"}
              </button>
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
                  <button
                    onClick={handleSendMessageWithImage}
                    disabled={isLoading}
                  >
                    {isLoading ? "Enviando..." : "Enviar"}
                  </button>
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
