import React, { useState, useEffect, useRef } from 'react';
import { 
    MessageCircle, 
    Send, 
    Mic, 
    MicOff, 
    Sparkles, 
    Hash,
    BarChart2,
    Zap,
    Cpu,
    CheckCircle,
    AlertCircle,
    ShoppingCart,
    Package,
    Calendar,
    DollarSign,
    Hash as NumberSign,
    Layers,
    Layout,
    FileText,
    Image,
    Globe,
     PlusCircle
} from 'lucide-react';
import './ChatAssistance.css';
import Sidebar from '../Sidebar';
import { useAuth } from '../user_login/AuthContext';

const SimbaaChat = () => {
    const { userId } = useAuth();
    const [isChatOpen, setIsChatOpen] = useState(true);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: 'Hello there, I am Simbaa your Nirvana Smart-Chain\'s assistance bot. How can I help you today?',
            sender: 'bot',
            type: 'welcome'
        }
    ]);
    const [showQuickActions, setShowQuickActions] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [language, setLanguage] = useState('en-US');
    const messagesEndRef = useRef(null);

    // Product addition workflow states
    const [productAdditionMode, setProductAdditionMode] = useState(false);
    const [currentField, setCurrentField] = useState(null);
    const [newProduct, setNewProduct] = useState({
        name: '',
        category: '',
        exp_date: '',
        price_per_unit: '',
        quantity_of_uom: '',
        shelf_num: '',
        uom_id: '',
        picture_of_the_prod: '',
        description: '',
        user_id: userId,
    });

    // Language options
    const languageOptions = [
        { code: 'en-US', name: 'English' },
        { code: 'hi-IN', name: 'Hindi' },
        { code: 'bn-IN', name: 'Bengali' }
    ];

    // Field prompts in multiple languages
    const productFieldPrompts = {
        'en-US': [
            { field: 'name', prompt: 'What is the name of the product?' },
            { field: 'category', prompt: 'What category does this product belong to?' },
            { field: 'exp_date', prompt: 'What is the expiry date? (YYYY-MM-DD)' },
            { field: 'price_per_unit', prompt: 'What is the price per unit?' },
            { field: 'quantity_of_uom', prompt: 'What is the quantity?' },
            { field: 'uom_id', prompt: 'What is the unit of measurement ID?' },
            { field: 'shelf_num', prompt: 'What shelf number should this product be stored on?' },
            { field: 'picture_of_the_prod', prompt: 'Do you have an image URL for this product? (Optional, type "skip" to skip)' },
            { field: 'description', prompt: 'Please provide a brief description of the product.' }
        ],
        'hi-IN': [
            { field: 'name', prompt: 'उत्पाद का नाम क्या है?' },
            { field: 'category', prompt: 'यह उत्पाद किस श्रेणी से संबंधित है?' },
            { field: 'exp_date', prompt: 'समाप्ति तिथि क्या है? (YYYY-MM-DD)' },
            { field: 'price_per_unit', prompt: 'प्रति इकाई मूल्य क्या है?' },
            { field: 'quantity_of_uom', prompt: 'मात्रा कितनी है?' },
            { field: 'uom_id', prompt: 'माप की इकाई ID क्या है?' },
            { field: 'shelf_num', prompt: 'इस उत्पाद को किस शेल्फ नंबर पर रखा जाना चाहिए?' },
            { field: 'picture_of_the_prod', prompt: 'क्या आपके पास इस उत्पाद का कोई छवि URL है? (वैकल्पिक, छोड़ने के लिए "skip" टाइप करें)' },
            { field: 'description', prompt: 'कृपया उत्पाद का संक्षिप्त विवरण प्रदान करें।' }
        ],
        'bn-IN': [
            { field: 'name', prompt: 'পণ্যের নাম কি?' },
            { field: 'category', prompt: 'এই পণ্যটি কোন শ্রেণীর অন্তর্গত?' },
            { field: 'exp_date', prompt: 'মেয়াদ শেষ হওয়ার তারিখ কি? (YYYY-MM-DD)' },
            { field: 'price_per_unit', prompt: 'একক প্রতি দাম কত?' },
            { field: 'quantity_of_uom', prompt: 'পরিমাণ কত?' },
            { field: 'uom_id', prompt: 'পরিমাপের একক আইডি কি?' },
            { field: 'shelf_num', prompt: 'এই পণ্যটি কোন শেল্ফ নম্বরে রাখা উচিত?' },
            { field: 'picture_of_the_prod', prompt: 'আপনার কাছে কি এই পণ্যের জন্য কোনো ছবির URL আছে? (ঐচ্ছিক, বাদ দিতে "skip" টাইপ করুন)' },
            { field: 'description', prompt: 'অনুগ্রহ করে পণ্যের একটি সংক্ষিপ্ত বিবরণ দিন।' }
        ]
    };

    // Use the current language to get the correct prompts
    const productFieldSequence = productFieldPrompts[language] || productFieldPrompts['en-US'];

    // Field icons for better visualization
    const fieldIcons = {
        name: <Package className="message-icon welcome-icon" />,
        category: <Layout className="message-icon welcome-icon" />,
        exp_date: <Calendar className="message-icon welcome-icon" />,
        price_per_unit: <DollarSign className="message-icon welcome-icon" />,
        quantity_of_uom: <NumberSign className="message-icon welcome-icon" />,
        uom_id: <Layers className="message-icon welcome-icon" />,
        shelf_num: <ShoppingCart className="message-icon welcome-icon" />,
        picture_of_the_prod: <Image className="message-icon welcome-icon" />,
        description: <FileText className="message-icon welcome-icon" />
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Set user ID whenever it changes
        setNewProduct(prev => ({ ...prev, user_id: userId }));
    }, [userId]);

    // Function to handle language change
    const handleLanguageChange = (code) => {
        setLanguage(code);
        
        // Add a notification about language change
        const languageName = languageOptions.find(lang => lang.code === code)?.name || 'Selected';
        const notificationMessage = {
            id: messages.length + 1,
            text: `Language changed to ${languageName}`,
            sender: 'bot',
            type: 'notification'
        };
        
        setMessages(prevMessages => [...prevMessages, notificationMessage]);
        
        // If in product addition mode, update the current field prompt
        if (productAdditionMode && currentField !== null) {
            const fieldPrompt = {
                id: messages.length + 2,
                text: productFieldPrompts[code][currentField].prompt,
                sender: 'bot',
                type: 'field-prompt',
                fieldName: productFieldPrompts[code][currentField].field,
                icon: fieldIcons[productFieldPrompts[code][currentField].field]
            };
            setMessages(prevMessages => [...prevMessages, fieldPrompt]);
        }
    };

    // Function to detect add product intent
    const detectAddProductIntent = (text) => {
        const addProductKeywords = [
            'add product', 'add a product', 'add new product', 'new product', 
            'create product', 'insert product', 'register product',
            'सामान जोड़ें', 'प्रोडक्ट जोड़ें', 'नया सामान', 'नया प्रोडक्ट', // Hindi
            'পণ্য যোগ করুন', 'নতুন পণ্য', 'পণ্য তৈরি করুন' // Bengali
        ];
        return addProductKeywords.some(keyword => 
            text.toLowerCase().includes(keyword.toLowerCase())
        );
    };

    // Function to get welcome message based on language
    const getWelcomeMessage = () => {
        switch(language) {
            case 'hi-IN':
                return "उत्पाद जोड़ने के लिए शुरू करें! मैं आपकी मदद करूंगा।";
            case 'bn-IN':
                return "চলুন একটি নতুন পণ্য যোগ করি! আমি আপনাকে সাহায্য করব।";
            default:
                return "Great! Let's add a new product to your inventory. I'll ask you for some details.";
        }
    };

    // Function to start product addition workflow
    const startProductAddition = () => {
        setProductAdditionMode(true);
        setCurrentField(0);
        
        // Add a confirmation message
        const botMessage = {
            id: messages.length + 1,
            text: getWelcomeMessage(),
            sender: 'bot',
            type: 'recommendation'
        };
        
        setMessages(prevMessages => [...prevMessages, botMessage]);
        
        // Ask for the first field
        setTimeout(() => {
            const fieldPrompt = {
                id: messages.length + 2,
                text: productFieldSequence[0].prompt,
                sender: 'bot',
                type: 'field-prompt',
                fieldName: productFieldSequence[0].field,
                icon: fieldIcons[productFieldSequence[0].field]
            };
            setMessages(prevMessages => [...prevMessages, fieldPrompt]);
        }, 1000);
    };

    // Function to handle product field updates
    const handleProductFieldUpdate = (value) => {
        const currentFieldData = productFieldSequence[currentField];
        const fieldName = currentFieldData.field;
        
        // Skip optional field if user types "skip"
        if (value.toLowerCase() === 'skip' && fieldName === 'picture_of_the_prod') {
            value = '';
        }
        
        // Process the value based on field type
        let processedValue = value;
        if (fieldName === 'price_per_unit' || fieldName === 'quantity_of_uom' || fieldName === 'uom_id') {
            const numberValue = Number(value);
            if (isNaN(numberValue)) {
                // Handle invalid number input
                const errorMessage = {
                    id: messages.length + 1,
                    text: `This field requires a number. Please enter a valid number.`,
                    sender: 'bot',
                    type: 'error'
                };
                setMessages(prevMessages => [...prevMessages, errorMessage]);
                return false;
            }
            processedValue = numberValue;
        }
        
        // Update the product state
        setNewProduct(prev => ({
            ...prev,
            [fieldName]: processedValue
        }));
        
        // Confirmation message
        const confirmationMessage = {
            id: messages.length + 1,
            text: `${fieldName.replace(/_/g, ' ').charAt(0).toUpperCase() + fieldName.replace(/_/g, ' ').slice(1)}: ${value}`,
            sender: 'bot',
            type: 'field-confirmation',
            fieldName: fieldName,
            icon: fieldIcons[fieldName]
        };
        
        setMessages(prevMessages => [...prevMessages, confirmationMessage]);
        
        return true;
    };

    // Function to move to next field or complete product addition
    const moveToNextField = () => {
        const nextFieldIndex = currentField + 1;
        
        if (nextFieldIndex < productFieldSequence.length) {
            setCurrentField(nextFieldIndex);
            
            // Ask for the next field
            const nextFieldPrompt = {
                id: messages.length + 1,
                text: productFieldSequence[nextFieldIndex].prompt,
                sender: 'bot',
                type: 'field-prompt',
                fieldName: productFieldSequence[nextFieldIndex].field,
                icon: fieldIcons[productFieldSequence[nextFieldIndex].field]
            };
            
            setMessages(prevMessages => [...prevMessages, nextFieldPrompt]);
        } else {
            // All fields completed, submit product
            submitProduct();
        }
    };

    // Function to submit product to the backend
    const submitProduct = async () => {
        const processingMessage = {
            id: messages.length + 1,
            text: language === 'hi-IN' ? 'आपके उत्पाद जोड़ने के अनुरोध को संसाधित किया जा रहा है...' :
                  language === 'bn-IN' ? 'আপনার পণ্য যোগ করার অনুরোধ প্রক্রিয়া করা হচ্ছে...' :
                  'Processing your product addition request...',
            sender: 'bot',
            type: 'analysis'
        };
        
        setMessages(prevMessages => [...prevMessages, processingMessage]);
        
        const formData = new FormData();
        formData.append('data', JSON.stringify(newProduct));
        
        try {
            const response = await fetch('http://127.0.0.1:5000/insertProduct', {
                method: 'POST',
                body: formData,
            });
            
            if (response.ok) {
                const result = await response.json();
                
                // Success message with product details
                const successMessage = {
                    id: messages.length + 2,
                    text: language === 'hi-IN' ? 
                          `✅ उत्पाद सफलतापूर्वक जोड़ा गया! 
                          
उत्पाद विवरण:
• नाम: ${newProduct.name}
• श्रेणी: ${newProduct.category}
• मूल्य: ${newProduct.price_per_unit}
• मात्रा: ${newProduct.quantity_of_uom}
• शेल्फ: ${newProduct.shelf_num}` :
                          language === 'bn-IN' ? 
                          `✅ পণ্য সফলভাবে যোগ করা হয়েছে! 
                          
পণ্যের বিবরণ:
• নাম: ${newProduct.name}
• শ্রেণী: ${newProduct.category}
• দাম: ${newProduct.price_per_unit}
• পরিমাণ: ${newProduct.quantity_of_uom}
• শেল্ফ: ${newProduct.shelf_num}` :
                          `✅ Product added successfully! 
                          
Product Details:
• Name: ${newProduct.name}
• Category: ${newProduct.category}
• Price: ${newProduct.price_per_unit}
• Quantity: ${newProduct.quantity_of_uom}
• Shelf: ${newProduct.shelf_num}`,
                    sender: 'bot',
                    type: 'success'
                };
                
                setMessages(prevMessages => [...prevMessages, successMessage]);
                
                // Reset product state
                setNewProduct({
                    name: '',
                    category: '',
                    exp_date: '',
                    price_per_unit: '',
                    quantity_of_uom: '',
                    shelf_num: '',
                    uom_id: '',
                    picture_of_the_prod: '',
                    description: '',
                    user_id: userId,
                });
                
                // Exit product addition mode
                setProductAdditionMode(false);
                setCurrentField(null);
                
                // Final message
                setTimeout(() => {
                    const finalMessage = {
                        id: messages.length + 3,
                        text: language === 'hi-IN' ? 'क्या कुछ और है जिसमें मैं आपकी मदद कर सकता हूँ?' :
                              language === 'bn-IN' ? 'আর কিছু আছে যেখানে আমি আপনাকে সাহায্য করতে পারি?' :
                              'Is there anything else you would like me to help you with?',
                        sender: 'bot',
                        type: 'welcome'
                    };
                    setMessages(prevMessages => [...prevMessages, finalMessage]);
                }, 1500);
                
            } else {
                // Error message
                const errorMessage = {
                    id: messages.length + 2,
                    text: language === 'hi-IN' ? 
                          `❌ उत्पाद जोड़ने में विफल: ${response.statusText}। कृपया जानकारी की जांच करें और पुनः प्रयास करें।` :
                          language === 'bn-IN' ? 
                          `❌ পণ্য যোগ করতে ব্যর্থ: ${response.statusText}। অনুগ্রহ করে তথ্য পরীক্ষা করুন এবং আবার চেষ্টা করুন।` :
                          `❌ Failed to add product: ${response.statusText}. Please check the information and try again.`,
                    sender: 'bot',
                    type: 'error'
                };
                
                setMessages(prevMessages => [...prevMessages, errorMessage]);
                
                // Reset to previous field to retry
                setCurrentField(0);
                const retryMessage = {
                    id: messages.length + 3,
                    text: language === 'hi-IN' ? 
                          "आइए उत्पाद को फिर से जोड़ने का प्रयास करें। " + productFieldSequence[0].prompt :
                          language === 'bn-IN' ? 
                          "চলুন আবার পণ্য যোগ করার চেষ্টা করি। " + productFieldSequence[0].prompt :
                          "Let's try adding the product again. " + productFieldSequence[0].prompt,
                    sender: 'bot',
                    type: 'field-prompt',
                    fieldName: productFieldSequence[0].field,
                    icon: fieldIcons[productFieldSequence[0].field]
                };
                
                setTimeout(() => {
                    setMessages(prevMessages => [...prevMessages, retryMessage]);
                }, 1500);
            }
        } catch (error) {
            // Connection error
            const errorMessage = {
                id: messages.length + 2,
                text: language === 'hi-IN' ? 
                      `❌ सर्वर से कनेक्ट करने में त्रुटि: ${error.message}। कृपया अपने कनेक्शन की जांच करें और पुनः प्रयास करें।` :
                      language === 'bn-IN' ? 
                      `❌ সার্ভারে সংযোগ করতে ত্রুটি: ${error.message}। অনুগ্রহ করে আপনার সংযোগ পরীক্ষা করুন এবং আবার চেষ্টা করুন।` :
                      `❌ Error connecting to the server: ${error.message}. Please check your connection and try again.`,
                sender: 'bot',
                type: 'error'
            };
            
            setMessages(prevMessages => [...prevMessages, errorMessage]);
            
            // Exit product addition mode
            setProductAdditionMode(false);
            setCurrentField(null);
        }
    };

    // Handle sending message
    const handleSendMessage = () => {
        if (message.trim()) {
            const userMessage = {
                id: messages.length + 1,
                text: message,
                sender: 'user',
                type: 'text'
            };
            
            setMessages(prevMessages => [...prevMessages, userMessage]);
            
            // If in product addition mode, process the field input
            if (productAdditionMode && currentField !== null) {
                const validInput = handleProductFieldUpdate(message.trim());
                if (validInput) {
                    setTimeout(() => {
                        moveToNextField();
                    }, 1000);
                }
            } 
            // Check for product addition intent
            else if (detectAddProductIntent(message)) {
                startProductAddition();
            } 
            // Handle other queries
            else {
                // Simulate response for other queries
                setTimeout(() => {
                    const botResponse = {
                        id: messages.length + 2,
                        text: language === 'hi-IN' ? 
                              `मैं समझता हूं कि आप यह जानना चाहते हैं: "${message}". वर्तमान में, मैं मुख्य रूप से आपके इन्वेंटरी में उत्पाद जोड़ने में मदद करने के लिए सेट हूं। क्या आप एक नया उत्पाद जोड़ना चाहेंगे? यदि हां, तो बस कहें "उत्पाद जोड़ें".` :
                              language === 'bn-IN' ? 
                              `আমি বুঝতে পারছি আপনি জানতে চান: "${message}". বর্তমানে, আমি প্রাথমিকভাবে আপনার ইনভেন্টরিতে পণ্য যোগ করতে সাহায্য করার জন্য সেট আপ করা হয়েছে। আপনি কি একটি নতুন পণ্য যোগ করতে চান? যদি হ্যাঁ, তাহলে শুধু বলুন "পণ্য যোগ করুন".` :
                              `I understood you want to know about: "${message}". Currently, I'm primarily set up to help you add products to your inventory. Would you like to add a new product? If so, just say "add product".`,
                        sender: 'bot',
                        type: 'analysis'
                    };
                    setMessages(prevMessages => [...prevMessages, botResponse]);
                }, 1500);
            }
            
            setMessage('');
        }
    };

    // Voice recognition function with multi-language support
    const startVoiceRecognition = () => {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new window.webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = language; // Use the current language setting
            
            recognition.onstart = () => {
                setIsListening(true);
            };
            
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setMessage(transcript);
                
                // Auto-send after voice recognition
                setTimeout(() => {
                    setIsListening(false);
                    handleSendMessage();
                }, 500);
            };
            
            recognition.onerror = () => {
                setIsListening(false);
                // Error notification
                const errorMessage = {
                    id: messages.length + 1,
                    text: language === 'hi-IN' ? 
                          `क्षमा करें, मैं उसे स्पष्ट रूप से नहीं सुन सका। कृपया फिर से बोलने का प्रयास करें या अपना संदेश टाइप करें।` :
                          language === 'bn-IN' ? 
                          `দুঃখিত, আমি সেটা পরিষ্কারভাবে শুনতে পাইনি। অনুগ্রহ করে আবার বলার চেষ্টা করুন বা আপনার বার্তা টাইপ করুন।` :
                          `Sorry, I couldn't hear that clearly. Please try speaking again or type your message.`,
                    sender: 'bot',
                    type: 'error'
                };
                setMessages(prevMessages => [...prevMessages, errorMessage]);
            };
            
            recognition.start();
        } else {
            alert('Voice recognition is not available in your browser');
        }
    };

    // Handle key press (Enter to send)
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    // Render message icon based on message type
    const renderMessageIcon = (type, fieldName) => {
        switch(type) {
            case 'welcome': return <Sparkles className="message-icon welcome-icon" />;
            case 'analysis': return <Zap className="message-icon analysis-icon" />;
            case 'recommendation': return <Cpu className="message-icon recommendation-icon" />;
            case 'success': return <CheckCircle className="message-icon success-icon" />;
            case 'error': return <AlertCircle className="message-icon error-icon" />;
            case 'notification': return <Globe className="message-icon notification-icon" />;
            case 'field-prompt': 
            case 'field-confirmation':
                return fieldName && fieldIcons[fieldName] ? 
                    React.cloneElement(fieldIcons[fieldName], { className: "message-icon welcome-icon" }) : 
                    <ShoppingCart className="message-icon field-icon" />;
            default: return null;
        }
    };

    return (
        <div className="simbaa-chat-container">
            <Sidebar/>
            <div className="simbaa-chat-wrapper">
                {/* Header */}
                <div className="simbaa-chat-header">
                    <div className="simbaa-header-content">
                        <MessageCircle className="simbaa-header-icon" />
                        <h1 className="simbaa-header-title">Simbaa 1.O</h1>
                    </div>
                    <div className="simbaa-header-badges">
                        <span className="simbaa-badge simbaa-badge-primary">Smart-Chain</span>
                        <span className="simbaa-badge simbaa-badge-secondary">Smart-Inventory</span>
                        <div className="simbaa-lang-container">
  <div className="simbaa-lang-dropdown">
    <button className="simbaa-lang-toggle">
      <span className="simbaa-globe-icon">🌐</span>
      <span className="simbaa-selected-lang">{language ? languageOptions.find(l => l.code === language)?.name : 'Choose Language'}</span>
      <span className="simbaa-chevron-icon">▼</span>
    </button>
    <div className="simbaa-lang-menu">
      {languageOptions.map(lang => (
        <button 
          key={lang.code} 
          onClick={() => handleLanguageChange(lang.code)} 
          className={`simbaa-lang-item ${language === lang.code ? 'simbaa-lang-active' : ''}`}
        >
          <span className="simbaa-lang-flag">{lang.flag}</span>
          <span className="simbaa-lang-name">{lang.name}</span>
        </button>
      ))}
    </div>
  </div>
</div>

                    </div>
                </div>

                {/* Chat Messages */}
                <div className="simbaa-chat-messages-container">
                    {messages.map((msg) => (
                        <div 
                            key={msg.id} 
                            className={`simbaa-message-wrapper ${
                                msg.sender === 'user' 
                                    ? 'simbaa-user-message' 
                                    : 'simbaa-bot-message'
                            } ${msg.type}`}
                        >
                            {msg.sender === 'bot' && renderMessageIcon(msg.type, msg.fieldName)}
                            <div 
                                className={`simbaa-message ${
                                    msg.sender === 'user' 
                                        ? 'simbaa-user-bubble' 
                                        : 'simbaa-bot-bubble'
                                } ${msg.type}`}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="simbaa-chat-input-container">
    <div className="simbaa-input-wrapper">
        <div className="simbaa-input-icon-wrapper">
            <input 
                type="text" 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                    productAdditionMode 
                        ? language === 'hi-IN' 
                            ? "उत्पाद जोड़ने के लिए टाइप करें..." 
                            : language === 'bn-IN' 
                                ? "পণ্য যোগ করতে টাইপ করুন..." 
                                : "Type product details..."
                        : language === 'hi-IN' 
                            ? "उत्पाद डालने के लिए टाइप करें..." 
                            : language === 'bn-IN' 
                                ? "পণ্য প্রবেশ করাতে টাইপ করুন..." 
                                : "Type your query..."
                }
                className="simbaa-chat-input"
            />
            <Hash className="simbaa-input-icon" />
        </div>
        <div className="simbaa-input-buttons">
            <div className="simbaa-quick-actions">
                <button 
                    onClick={() => setShowQuickActions(!showQuickActions)} 
                    className="simbaa-quick-button"
                >
                    <Zap />
                    <span>&nbsp;Quick Actions</span>
                </button>
                {showQuickActions && (
                    <div className="simbaa-quick-actions-dropdown">
                        <button 
                            onClick={() => {
                                setShowQuickActions(false);
                                startProductAddition(); // Call startProductAddition directly
                            }}
                            className="simbaa-action-item"
                        >
                            <PlusCircle size={16} />
                            <span>Add Product</span>
                        </button>
                        {/* Add more quick actions here if needed */}
                    </div>
                )}
            </div>
            <button 
                onClick={startVoiceRecognition}
                className={`simbaa-voice-button ${
                    isListening ? 'simbaa-listening' : ''
                }`}
            >
                {isListening ? <MicOff /> : <Mic />}
            </button>
            <button 
                onClick={handleSendMessage} // Keep using handleSendMessage which handles all cases
                className="simbaa-send-button"
            >
                <Send />
            </button>
        </div>
    </div>
</div>
            </div>
        </div>
    );
};

export default SimbaaChat;