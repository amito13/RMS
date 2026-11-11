import { StyleSheet } from 'react-native';

export const authStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f7f9' },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
  form: { gap: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 24 },
  footerText: { color: '#666', fontSize: 15 },
  link: { color: '#1f5eff', fontSize: 15, fontWeight: '600' },
});
