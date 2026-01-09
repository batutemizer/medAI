import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { registerUser, loginUser } from '../services/authService';

const LoginScreen = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const emailInputRef = React.useRef(null);
  const passwordInputRef = React.useRef(null);
  const displayNameInputRef = React.useRef(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen email ve şifre girin');
      return;
    }

    setLoading(true);
    try {
      const result = await loginUser(email.trim(), password);
      
      if (result.success) {
        onLoginSuccess(result.user);
      } else {
        Alert.alert('Giriş Hatası', result.error || 'Giriş yapılamadı');
      }
    } catch (error) {
      console.error('Login hatası:', error);
      Alert.alert('Hata', 'Giriş yapılırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen email ve şifre girin');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Geçersiz Şifre', 'Şifre en az 6 karakter olmalıdır');
      return;
    }

    setLoading(true);
    try {
      const result = await registerUser(email.trim(), password, displayName.trim());
      
      if (result.success) {
        Alert.alert('Başarılı', 'Kayıt başarıyla oluşturuldu!', [
          { text: 'Tamam', onPress: () => onLoginSuccess(result.user) }
        ]);
      } else {
        Alert.alert('Kayıt Hatası', result.error || 'Kayıt oluşturulamadı');
      }
    } catch (error) {
      console.error('Register hatası:', error);
      Alert.alert('Hata', 'Kayıt oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../assets/unnamed.jpg')}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Animated.View 
                style={[
                  styles.content,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                {/* HEADER */}
                <View style={styles.header}>
                  <Text style={styles.title}>MedAI</Text>
                  <Text style={styles.subtitle}>
                    {isLogin 
                      ? 'Hesabınıza giriş yapın' 
                      : 'Yeni hesap oluşturun'}
                  </Text>
                </View>

                {/* FORM CARD */}
                <View style={styles.formCard}>
                  {!isLogin && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Ad Soyad</Text>
                      <View style={[
                        styles.inputContainer,
                        focusedInput === 'displayName' && styles.inputContainerFocused
                      ]}>
                        <TextInput
                          ref={displayNameInputRef}
                          style={styles.input}
                          placeholder="Adınız ve soyadınız"
                          placeholderTextColor="#9ca3af"
                          value={displayName}
                          onChangeText={setDisplayName}
                          onFocus={() => setFocusedInput('displayName')}
                          onBlur={() => setFocusedInput(null)}
                          autoCapitalize="words"
                          editable={!loading}
                          returnKeyType="next"
                          blurOnSubmit={false}
                          onSubmitEditing={() => emailInputRef.current?.focus()}
                        />
                      </View>
                    </View>
                  )}

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <View style={[
                      styles.inputContainer,
                      focusedInput === 'email' && styles.inputContainerFocused
                    ]}>
                      <TextInput
                        ref={emailInputRef}
                        style={styles.input}
                        placeholder="ornek@email.com"
                        placeholderTextColor="#9ca3af"
                        value={email}
                        onChangeText={setEmail}
                        onFocus={() => setFocusedInput('email')}
                        onBlur={() => setFocusedInput(null)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!loading}
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => passwordInputRef.current?.focus()}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Şifre</Text>
                    <View style={[
                      styles.inputContainer,
                      focusedInput === 'password' && styles.inputContainerFocused
                    ]}>
                      <TextInput
                        ref={passwordInputRef}
                        style={[styles.input, styles.passwordInput]}
                        placeholder="En az 6 karakter"
                        placeholderTextColor="#9ca3af"
                        value={password}
                        onChangeText={setPassword}
                        onFocus={() => setFocusedInput('password')}
                        onBlur={() => setFocusedInput(null)}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        editable={!loading}
                        returnKeyType="done"
                        blurOnSubmit={true}
                        onSubmitEditing={isLogin ? handleLogin : handleRegister}
                      />
                      <TouchableOpacity
                        style={styles.visibilityToggle}
                        onPress={() => setShowPassword(!showPassword)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={styles.visibilityIcon}>
                          {showPassword ? 'Gizle' : 'Göster'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* PRIMARY BUTTON */}
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      loading && styles.buttonDisabled
                    ]}
                    onPress={isLogin ? handleLogin : handleRegister}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {loading ? (
                      <View style={styles.buttonContent}>
                        <ActivityIndicator color="#ffffff" size="small" />
                        <Text style={[styles.buttonText, styles.buttonTextLoading]}>
                          {isLogin ? 'Giriş yapılıyor...' : 'Kayıt oluşturuluyor...'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.buttonText}>
                        {isLogin ? 'Giriş Yap' : 'Hesap Oluştur'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* SWITCH MODE */}
                  <View style={styles.switchContainer}>
                    <Text style={styles.switchText}>
                      {isLogin ? 'Hesabınız yok mu? ' : 'Zaten hesabınız var mı? '}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setIsLogin(!isLogin);
                        setEmail('');
                        setPassword('');
                        setDisplayName('');
                        setShowPassword(false);
                        setFocusedInput(null);
                      }}
                      disabled={loading}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.switchLink}>
                        {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  content: {
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '400',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    minHeight: 52,
  },
  inputContainerFocused: {
    borderColor: '#111827',
    backgroundColor: '#ffffff',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 14,
    fontWeight: '400',
  },
  passwordInput: {
    paddingRight: 60,
  },
  visibilityToggle: {
    position: 'absolute',
    right: 16,
    paddingVertical: 4,
  },
  visibilityIcon: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
    minHeight: 52,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonTextLoading: {
    marginLeft: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  switchText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '400',
  },
  switchLink: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    marginLeft: 4,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
