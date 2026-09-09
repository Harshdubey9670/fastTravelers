import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../theme/colors';
import { translations } from '../i18n/translations';
import { useAuthStore } from '../store/useAuthStore';
import { IRideMessage } from '@gaon-auto/types';

interface QuickChatModalProps {
  visible: boolean;
  onClose: () => void;
  messages: IRideMessage[];
  currentUserId?: string;
  onSendMessage: (text: string, quickReplyCode?: string) => Promise<boolean>;
}

export const QuickChatModal: React.FC<QuickChatModalProps> = ({
  visible,
  onClose,
  messages,
  currentUserId,
  onSendMessage,
}) => {
  const { language } = useAuthStore();
  const t = translations[language];
  const [customText, setCustomText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (text: string, code?: string) => {
    if (!text.trim()) return;
    setIsSending(true);
    await onSendMessage(text, code);
    setCustomText('');
    setIsSending(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>💬 {t.chatWithDriver}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Messages list */}
          <ScrollView style={styles.messagesList} contentContainerStyle={{ paddingVertical: 10 }}>
            {messages.length === 0 ? (
              <Text style={styles.emptyText}>
                {language === 'hi' ? 'कोई संदेश नहीं' : 'No messages yet'}
              </Text>
            ) : (
              messages.map((msg, index) => {
                const isMe = msg.senderId === currentUserId;
                return (
                  <View
                    key={msg.id || index}
                    style={[
                      styles.messageBubble,
                      isMe ? styles.myBubble : styles.theirBubble,
                    ]}
                  >
                    <Text style={[styles.bubbleText, isMe ? styles.myText : styles.theirText]}>
                      {msg.text}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Quick Replies row */}
          <Text style={styles.quickTitle}>
            {language === 'hi' ? 'त्वरित संदेश (1-टैप):' : 'Quick replies (1-tap):'}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRow}
          >
            {t.quickReplies.map((reply, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickChip}
                onPress={() => handleSend(reply, `QR_${index}`)}
              >
                <Text style={styles.quickChipText}>{reply}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Custom text input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={language === 'hi' ? 'संदेश लिखें...' : 'Type a message...'}
              placeholderTextColor={Colors.textMuted}
              value={customText}
              onChangeText={setCustomText}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => handleSend(customText)}
              disabled={isSending || !customText.trim()}
            >
              <Text style={styles.sendText}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    color: Colors.textSecondary,
    fontSize: 18,
    fontWeight: '700',
  },
  messagesList: {
    height: 180,
    marginVertical: 8,
  },
  emptyText: {
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 12,
    marginVertical: 4,
    maxWidth: '80%',
  },
  myBubble: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
  },
  theirBubble: {
    backgroundColor: Colors.surfaceBg,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  myText: {
    color: Colors.white,
  },
  theirText: {
    color: Colors.textPrimary,
  },
  quickTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
  },
  quickChip: {
    backgroundColor: Colors.surfaceBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  quickChipText: {
    color: Colors.sunlightYellow,
    fontSize: 13,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    color: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
