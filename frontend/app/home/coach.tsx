import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { COLORS, SPACING, FONT_SIZES } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import { ChatMessage as ChatMessageType } from '../../src/types';

export default function CoachScreen() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const response = await api.get('/coach/history');
      setMessages(response.data.messages || []);
      
      // If no history, add welcome message
      if (!response.data.messages || response.data.messages.length === 0) {
        setMessages([
          {
            role: 'assistant',
            content:
              "Hi! I'm Coach Alex, your personal tennis coach. I'm here to help you improve your game with tips, motivation, and strategy advice. What would you like to work on today?",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage = inputText.trim();
    setInputText('');

    // Add user message to UI
    const newUserMessage: ChatMessageType = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages([...messages, newUserMessage]);

    try {
      setLoading(true);
      const response = await api.post('/coach/chat', { message: userMessage });

      // Add coach response
      const coachMessage: ChatMessageType = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, coachMessage]);

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove user message on error
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    'How can I improve my serve?',
    'Tips for better footwork',
    'Best drills for consistency',
    'How to handle pressure?',
  ];

  return (
    <LinearGradient
      colors={[COLORS.primary, '#1a1a1a', COLORS.primary]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <View style={styles.coachInfo}>
            <View style={styles.coachAvatar}>
              <Ionicons name="person" size={32} color={COLORS.accent} />
            </View>
            <View>
              <Text style={styles.coachName}>Coach Alex</Text>
              <Text style={styles.coachStatus}>Online</Text>
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.length === 0 && (
            <View style={styles.welcomeContainer}>
              <View style={styles.welcomeIcon}>
                <Ionicons name="tennisball" size={60} color={COLORS.accent} />
              </View>
              <Text style={styles.welcomeTitle}>Welcome to AI Coach</Text>
              <Text style={styles.welcomeText}>
                Ask me anything about tennis technique, strategy, or training!
              </Text>
            </View>
          )}

          {messages.map((message, index) => (
            <View
              key={index}
              style={[
                styles.messageContainer,
                message.role === 'user'
                  ? styles.userMessageContainer
                  : styles.assistantMessageContainer,
              ]}
            >
              <Card
                style={[
                  styles.messageBubble,
                  message.role === 'user'
                    ? styles.userBubble
                    : styles.assistantBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.role === 'user'
                      ? styles.userText
                      : styles.assistantText,
                  ]}
                >
                  {message.content}
                </Text>
              </Card>
            </View>
          ))}

          {loading && (
            <View style={styles.assistantMessageContainer}>
              <Card style={[styles.messageBubble, styles.assistantBubble]}>
                <View style={styles.typingIndicator}>
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                </View>
              </Card>
            </View>
          )}

          {/* Quick Questions */}
          {messages.length <= 1 && (
            <View style={styles.quickQuestionsContainer}>
              <Text style={styles.quickQuestionsTitle}>Quick Questions:</Text>
              <View style={styles.quickQuestions}>
                {quickQuestions.map((question, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickQuestionButton}
                    onPress={() => {
                      setInputText(question);
                    }}
                  >
                    <Text style={styles.quickQuestionText}>{question}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask Coach Alex..."
            placeholderTextColor={COLORS.gray}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!loading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || loading) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || loading}
          >
            <Ionicons
              name="send"
              size={24}
              color={!inputText.trim() || loading ? COLORS.gray : COLORS.primary}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    padding: SPACING.lg,
    paddingTop: SPACING.xxl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkGray,
  },
  coachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  coachAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  coachStatus: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
  },
  messagesContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  welcomeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  welcomeTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  welcomeText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  messageContainer: {
    marginBottom: SPACING.md,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: SPACING.md,
  },
  userBubble: {
    backgroundColor: COLORS.accent,
  },
  assistantBubble: {
    backgroundColor: COLORS.secondary,
  },
  messageText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
  },
  userText: {
    color: COLORS.primary,
  },
  assistantText: {
    color: COLORS.white,
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray,
  },
  quickQuestionsContainer: {
    marginTop: SPACING.lg,
  },
  quickQuestionsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: SPACING.sm,
  },
  quickQuestions: {
    gap: SPACING.sm,
  },
  quickQuestionButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
  },
  quickQuestionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.accentBlue,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkGray,
    gap: SPACING.sm,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    borderRadius: 24,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.darkGray,
  },
});