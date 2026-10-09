import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const shotTypes = [
  'Front 3/4',
  'Rear 3/4',
  'Side',
  'Front',
  'Rear',
  'Interior',
];

export default function ShotSelectionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Shot</Text>

      <Text style={styles.subtitle}>
        What are you photographing?
      </Text>

      <View style={styles.options}>
        {shotTypes.map((shot) => (
          <Pressable
             key={shot}
            style={styles.option}
            onPress={() => {
               if (shot === 'Front 3/4') {
                  router.push('/shoot');
    }
  }}
>
            <Text style={styles.optionText}>{shot}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
    paddingHorizontal: 24,
    paddingTop: 80,
  },

  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },

  subtitle: {
    color: '#aaaaaa',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 35,
  },

  options: {
    gap: 14,
  },

  option: {
    backgroundColor: '#222222',
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
  },

  optionText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});