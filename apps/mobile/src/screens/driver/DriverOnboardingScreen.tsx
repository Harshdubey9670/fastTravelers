import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { useAuthStore } from '../../store/useAuthStore';
import { translations } from '../../i18n/translations';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { api } from '../../services/api';

interface DriverOnboardingScreenProps {
  onSuccess: () => void;
}

export const DriverOnboardingScreen: React.FC<DriverOnboardingScreenProps> = ({ onSuccess }) => {
  const { language, user, driverProfile, loadProfile } = useAuthStore();
  const t = translations[language];
  const isHindi = language === 'hi';

  const [name, setName] = useState(user?.name || '');
  const [licenceNumber, setLicenceNumber] = useState(driverProfile?.licenceNumber || '');
  const [vehicleType, setVehicleType] = useState<'AUTO' | 'E_RICKSHAW'>('AUTO');
  const [registrationNumber, setRegistrationNumber] = useState(
    driverProfile?.vehicle?.registrationNumber || ''
  );
  const [seatingCapacity, setSeatingCapacity] = useState('3');
  const [upiId, setUpiId] = useState(driverProfile?.upiId || '');

  // Document upload state flags
  const [dlUploaded, setDlUploaded] = useState(false);
  const [rcUploaded, setRcUploaded] = useState(false);
  const [vehiclePhotoUploaded, setVehiclePhotoUploaded] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSimulatedDocUpload = (docName: string, setter: (val: boolean) => void) => {
    setter(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setErrorMsg(isHindi ? 'कृपया अपना पूरा नाम दर्ज करें।' : 'Please enter your full name.');
      return;
    }
    if (!licenceNumber.trim() || licenceNumber.trim().length < 5) {
      setErrorMsg(
        isHindi
          ? 'कृपया मान्य ड्राइविंग लाइसेंस नंबर दर्ज करें।'
          : 'Please enter a valid driving licence number.'
      );
      return;
    }
    if (!registrationNumber.trim() || registrationNumber.trim().length < 4) {
      setErrorMsg(
        isHindi
          ? 'कृपया मान्य वाहन पंजीकरण संख्या (RC) दर्ज करें।'
          : 'Please enter a valid vehicle registration number.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await api.onboardDriver({
        name: name.trim(),
        licenceNumber: licenceNumber.trim().toUpperCase(),
        upiId: upiId.trim() || undefined,
        vehicle: {
          vehicleType,
          registrationNumber: registrationNumber.trim().toUpperCase(),
          seatingCapacity: parseInt(seatingCapacity, 10) || 3,
        },
      });

      await loadProfile();
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Onboarding submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPendingVerification =
    driverProfile && driverProfile.verificationStatus === 'PENDING';

  return (
    <View style={styles.container}>
      <Header
        title={isHindi ? 'चालक साथी पंजीकरण' : 'Driver Registration'}
        showSos={false}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isPendingVerification ? (
          <Card style={styles.pendingCard}>
            <Text style={styles.pendingTitle}>
              ⏳ {isHindi ? 'सत्यापन प्रक्रिया जारी है' : 'Verification Under Review'}
            </Text>
            <Text style={styles.pendingSubtitle}>
              {isHindi
                ? 'आपका विवरण एडमिन को भेज दिया गया है। एडमिन द्वारा अनुमोदन मिलने के बाद आप ऑनलाइन जाकर सवारियाँ ले सकेंगे।'
                : 'Your driver profile is submitted. Once approved by the Admin Control Center, you will be able to go online.'}
            </Text>
            <Badge label="STATUS: PENDING APPROVAL" variant="warning" style={{ marginTop: 8 }} />
            <Button
              title={isHindi ? 'स्थिति पुनः जांचें (Refresh)' : 'Check Status'}
              variant="secondary"
              onPress={async () => {
                await loadProfile();
                if (driverProfile?.verificationStatus === 'APPROVED') {
                  onSuccess();
                }
              }}
              style={{ marginTop: 14 }}
            />
          </Card>
        ) : null}

        <Card style={styles.formCard}>
          <Text style={styles.sectionHeader}>
            🛺 {isHindi ? 'चालक व वाहन विवरण' : 'Driver & Vehicle Information'}
          </Text>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{isHindi ? 'पूरा नाम' : 'Full Name'} *</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder={isHindi ? 'उदा. राम कुमार' : 'e.g. Ram Kumar'}
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* Driving Licence */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{isHindi ? 'ड्राइविंग लाइसेंस नंबर' : 'Driving Licence No.'} *</Text>
            <TextInput
              style={styles.textInput}
              value={licenceNumber}
              onChangeText={setLicenceNumber}
              autoCapitalize="characters"
              placeholder="UP32 20200012345"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* DL Document Upload */}
          <View style={styles.docUploadRow}>
            <Text style={styles.docUploadLabel}>
              📄 {isHindi ? 'लाइसेंस फोटो / दस्तावेज़' : 'DL Document'}
            </Text>
            <TouchableOpacity
              style={[styles.uploadBtn, dlUploaded && styles.uploadedBtn]}
              onPress={() => handleSimulatedDocUpload('DL', setDlUploaded)}
            >
              <Text style={styles.uploadBtnText}>
                {dlUploaded ? '✓ ' + (isHindi ? 'संलग्न' : 'Attached') : '📎 ' + (isHindi ? 'अपलोड करें' : 'Upload')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Vehicle Type Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{isHindi ? 'वाहन का प्रकार' : 'Vehicle Type'} *</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[styles.typeBtn, vehicleType === 'AUTO' && styles.typeBtnActive]}
                onPress={() => setVehicleType('AUTO')}
              >
                <Text style={styles.typeEmoji}>🛺</Text>
                <Text style={[styles.typeText, vehicleType === 'AUTO' && styles.typeTextActive]}>
                  {isHindi ? 'ऑटो रिक्शा' : 'Auto Rickshaw'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeBtn, vehicleType === 'E_RICKSHAW' && styles.typeBtnActive]}
                onPress={() => setVehicleType('E_RICKSHAW')}
              >
                <Text style={styles.typeEmoji}>🔋</Text>
                <Text style={[styles.typeText, vehicleType === 'E_RICKSHAW' && styles.typeTextActive]}>
                  {isHindi ? 'ई-रिक्शा' : 'E-Rickshaw'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Registration Number (RC) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{isHindi ? 'वाहन नंबर (RC नंबर)' : 'Vehicle Registration No.'} *</Text>
            <TextInput
              style={styles.textInput}
              value={registrationNumber}
              onChangeText={setRegistrationNumber}
              autoCapitalize="characters"
              placeholder="UP 32 XY 7788"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* RC Document Upload */}
          <View style={styles.docUploadRow}>
            <Text style={styles.docUploadLabel}>
              📋 {isHindi ? 'RC दस्तावेज़ / फोटो' : 'RC Document'}
            </Text>
            <TouchableOpacity
              style={[styles.uploadBtn, rcUploaded && styles.uploadedBtn]}
              onPress={() => handleSimulatedDocUpload('RC', setRcUploaded)}
            >
              <Text style={styles.uploadBtnText}>
                {rcUploaded ? '✓ ' + (isHindi ? 'संलग्न' : 'Attached') : '📎 ' + (isHindi ? 'अपलोड करें' : 'Upload')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Vehicle Photo Upload */}
          <View style={styles.docUploadRow}>
            <Text style={styles.docUploadLabel}>
              📷 {isHindi ? 'वाहन की सामने से फोटो' : 'Vehicle Photo'}
            </Text>
            <TouchableOpacity
              style={[styles.uploadBtn, vehiclePhotoUploaded && styles.uploadedBtn]}
              onPress={() => handleSimulatedDocUpload('PHOTO', setVehiclePhotoUploaded)}
            >
              <Text style={styles.uploadBtnText}>
                {vehiclePhotoUploaded ? '✓ ' + (isHindi ? 'संलग्न' : 'Attached') : '📎 ' + (isHindi ? 'अपलोड करें' : 'Upload')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Seating Capacity */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{isHindi ? 'सवारियों की क्षमता' : 'Seating Capacity'}</Text>
            <TextInput
              style={styles.textInput}
              value={seatingCapacity}
              onChangeText={setSeatingCapacity}
              keyboardType="numeric"
              placeholder="3"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {/* UPI ID (Optional) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{isHindi ? 'UPI आईडी (किराया भुगतान हेतु - वैकल्पिक)' : 'UPI ID (Optional)'}</Text>
            <TextInput
              style={styles.textInput}
              value={upiId}
              onChangeText={setUpiId}
              autoCapitalize="none"
              placeholder="driver@okaxis"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          {errorMsg ? <Text style={styles.errorText}>⚠️ {errorMsg}</Text> : null}

          <Button
            title={isHindi ? 'सत्यापन हेतु जमा करें' : 'Submit for Verification'}
            variant="accent"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            size="large"
            style={{ marginTop: 16 }}
          />
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pendingCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: Colors.warning,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
  },
  pendingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.warning,
    marginBottom: 6,
  },
  pendingSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  formCard: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: Colors.surfaceBg,
    color: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  docUploadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceBg,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 14,
  },
  docUploadLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  uploadBtn: {
    backgroundColor: Colors.cardBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  uploadedBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: Colors.accent,
  },
  uploadBtnText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.surfaceBg,
  },
  typeBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
  },
  typeEmoji: {
    fontSize: 20,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  typeTextActive: {
    color: Colors.white,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
});
