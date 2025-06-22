import { View, Text, StyleSheet, SafeAreaView, Dimensions, Platform } from 'react-native';
import { Users } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { RoleGuard } from '@/components/RoleGuard';

function ConnectContent() {
  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const isWeb = Platform.OS === 'web';
  const isTablet = windowDimensions.width >= 768;
  const isDesktop = windowDimensions.width >= 1024;
  const isLargeDesktop = windowDimensions.width >= 1440;

  const getResponsiveStyles = () => {
    const baseStyles = styles;
    
    if (isWeb && isDesktop) {
      return {
        ...baseStyles,
        container: {
          ...baseStyles.container,
          backgroundColor: '#F8F9FA',
        },
        content: {
          ...baseStyles.content,
          maxWidth: isLargeDesktop ? 800 : 700,
          alignSelf: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          margin: 24,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 24,
          elevation: 8,
          paddingHorizontal: isLargeDesktop ? 60 : 48,
          paddingVertical: isLargeDesktop ? 80 : 60,
        },
        title: {
          ...baseStyles.title,
          fontSize: isLargeDesktop ? 36 : 32,
        },
        subtitle: {
          ...baseStyles.subtitle,
          fontSize: isLargeDesktop ? 20 : 18,
        },
      };
    } else if (isWeb && isTablet) {
      return {
        ...baseStyles,
        content: {
          ...baseStyles.content,
          maxWidth: 600,
          alignSelf: 'center',
          paddingHorizontal: 40,
        },
        title: {
          ...baseStyles.title,
          fontSize: 32,
        },
        subtitle: {
          ...baseStyles.subtitle,
          fontSize: 18,
        },
      };
    }
    
    return baseStyles;
  };

  const responsiveStyles = getResponsiveStyles();

  return (
    <SafeAreaView style={responsiveStyles.container}>
      <View style={responsiveStyles.content}>
        <View style={styles.header}>
          <View style={[
            styles.iconContainer,
            isWeb && isDesktop && {
              width: isLargeDesktop ? 100 : 90,
              height: isLargeDesktop ? 100 : 90,
              borderRadius: isLargeDesktop ? 50 : 45,
              marginBottom: isLargeDesktop ? 32 : 28,
            }
          ]}>
            <Users 
              size={isWeb && isDesktop ? (isLargeDesktop ? 48 : 44) : 32} 
              color="#007AFF" 
              strokeWidth={2} 
            />
          </View>
          <Text style={responsiveStyles.title}>Connect</Text>
        </View>
        <Text style={responsiveStyles.subtitle}>
          Share your progress with care team and family
        </Text>
        
        {/* Additional content for desktop */}
        {isWeb && isDesktop && (
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>
                Invite family members to view your progress
              </Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>
                Connect with your healthcare providers
              </Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>
                Share milestone achievements and updates
              </Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

export default function ConnectScreen() {
  return (
    <RoleGuard 
      allowedRoles={['patient']} 
      fallbackMessage="Connection features are designed for patients to share progress with their care team."
    >
      <ConnectContent />
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  featureList: {
    marginTop: 40,
    alignSelf: 'stretch',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    color: '#1C1C1E',
    flex: 1,
    lineHeight: 22,
  },
});