import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>CarShot Coach</Text>

        <Text style={styles.subtitle}>
          Take better car photos.
        </Text>

        <Text style={styles.description}>
          Get real-time guidance on framing, positioning, lighting, and
          composition while you shoot.
        </Text>

        <Pressable style={styles.button}
        onPress={()=> router.push('/shot-selection')}>

          <Text style={styles.buttonText}>Start Shooting</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  logo: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },

  subtitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 18,
  },

  description: {
    color: '#aaaaaa',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 350,
    marginBottom: 40,
  },

  button: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
  },

  buttonText: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '700',
  },
});