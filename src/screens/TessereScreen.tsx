import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  StatusBar,
  Dimensions,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {width, height} = Dimensions.get('window');

const STORAGE_KEY = '@stella_tessere';

const CARD_PRESETS = [
  {nome: 'Esselunga', tipo: 'Supermercato', emoji: '🛒', gradient: ['#2E3192', '#1BFFFF'] as [string, string]},
  {nome: 'Conad', tipo: 'Supermercato', emoji: '🛒', gradient: ['#D31027', '#EA384D'] as [string, string]},
  {nome: 'Carrefour', tipo: 'Supermercato', emoji: '🛒', gradient: ['#0052CC', '#2684FF'] as [string, string]},
  {nome: 'Coop', tipo: 'Supermercato', emoji: '🛒', gradient: ['#11998e', '#38ef7d'] as [string, string]},
  {nome: 'Eurospin', tipo: 'Supermercato', emoji: '🛒', gradient: ['#FC466B', '#3F5EFB'] as [string, string]},
  {nome: 'Lidl', tipo: 'Supermercato', emoji: '🛒', gradient: ['#005BBB', '#FFD500'] as [string, string]},
  {nome: 'Aldi', tipo: 'Supermercato', emoji: '🛒', gradient: ['#1A6B3C', '#52C97D'] as [string, string]},
  {nome: 'Auchan', tipo: 'Supermercato', emoji: '🛒', gradient: ['#FF416C', '#FF4B2B'] as [string, string]},
  {nome: 'Penny', tipo: 'Supermercato', emoji: '🛒', gradient: ['#DA8A67', '#E96464'] as [string, string]},
  {nome: 'Pam', tipo: 'Supermercato', emoji: '🛒', gradient: ['#F7971E', '#FFD200'] as [string, string]},
  {nome: 'Tessera Sanitaria', tipo: 'Sanitaria', emoji: '🏥', gradient: ['#2193b0', '#6dd5ed'] as [string, string]},
  {nome: 'Farmacia', tipo: 'Farmacia', emoji: '💊', gradient: ['#0f9b58', '#56ccf2'] as [string, string]},
  {nome: 'Personale', tipo: 'Altro', emoji: '💳', gradient: ['#7F00FF', '#E100FF'] as [string, string]},
];

interface Tessera {
  id: string;
  nome: string;
  numero: string;
  tipo: string;
  gradient: [string, string];
  emoji: string;
}

const renderBarcodeLines = (code: string) => {
  const lines = [];
  const seed = code.split('').reduce((a, c) => a + c.charCodeAt(0), 97);
  for (let i = 0; i < 38; i++) {
    const w = ((seed * (i + 1) * 13) % 4) + 1;
    const h = ((seed * (i + 3) * 7) % 22) + 14;
    const mg = ((seed * (i + 2)) % 3);
    lines.push(
      <View
        key={i}
        style={{
          width: w,
          height: h,
          backgroundColor: 'rgba(255,255,255,0.85)',
          marginHorizontal: mg / 2,
          alignSelf: 'flex-end',
          borderRadius: 1,
        }}
      />,
    );
  }
  return (
    <View style={{flexDirection: 'row', alignItems: 'flex-end', height: 36}}>
      {lines}
    </View>
  );
};

const formatCode = (num: string) =>
  num.replace(/(.{4})/g, '$1 ').trim();

export default function TessereScreen() {
  const [tessere, setTessere] = useState<Tessera[]>([]);
  const [modalAdd, setModalAdd] = useState(false);
  const [modalPreset, setModalPreset] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Tessera | null>(null);
  const [form, setForm] = useState<{
    nome: string;
    numero: string;
    tipo: string;
    gradient: [string, string];
    emoji: string;
  }>({
    nome: '',
    numero: '',
    tipo: 'Altro',
    gradient: ['#7F00FF', '#E100FF'],
    emoji: '💳',
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadTessere();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadTessere = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setTessere(JSON.parse(data));
      }
    } catch (_) {}
  };

  const saveTessere = async (list: Tessera[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (_) {}
  };

  const addTessera = () => {
    if (!form.nome.trim() || !form.numero.trim()) {
      Alert.alert('Attenzione', 'Inserisci nome e numero della tessera.');
      return;
    }
    const newCard: Tessera = {
      id: Date.now().toString(),
      nome: form.nome.trim(),
      numero: form.numero.trim(),
      tipo: form.tipo,
      gradient: form.gradient,
      emoji: form.emoji,
    };
    const updated = [newCard, ...tessere];
    setTessere(updated);
    saveTessere(updated);
    setModalAdd(false);
    setForm({nome: '', numero: '', tipo: 'Altro', gradient: ['#7F00FF', '#E100FF'], emoji: '💳'});
  };

  const deleteTessera = (id: string) => {
    Alert.alert('Elimina tessera', 'Sei sicuro di voler eliminare questa tessera?', [
      {text: 'Annulla', style: 'cancel'},
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: () => {
          const updated = tessere.filter(t => t.id !== id);
          setTessere(updated);
          saveTessere(updated);
          setSelectedCard(null);
        },
      },
    ]);
  };

  const selectPreset = (preset: typeof CARD_PRESETS[0]) => {
    setForm({
      nome: preset.nome,
      numero: '',
      tipo: preset.tipo,
      gradient: preset.gradient,
      emoji: preset.emoji,
    });
    setModalPreset(false);
    setModalAdd(true);
  };

  const renderCard = ({item}: {item: Tessera}) => (
    <TouchableOpacity
      onPress={() => setSelectedCard(item)}
      style={styles.cardWrapper}
      activeOpacity={0.9}>
      <LinearGradient
        colors={item.gradient}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardEmoji}>{item.emoji}</Text>
          <Text style={styles.cardTipo}>{item.tipo.toUpperCase()}</Text>
        </View>
        <Text style={styles.cardNome}>{item.nome}</Text>
        <Text style={styles.cardNumero}>{formatCode(item.numero)}</Text>
        <View style={styles.barcodeWrap}>{renderBarcodeLines(item.numero)}</View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={['#1A1A2E', '#16213E', '#0F3460']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />

      <View style={styles.header}>
        <Text style={styles.appTitle}>✨ Stella</Text>
        <Text style={styles.pageTitle}>Le mie Tessere</Text>
      </View>

      <Animated.View style={{flex: 1, opacity: fadeAnim}}>
        {tessere.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💳</Text>
            <Text style={styles.emptyTitle}>Nessuna tessera</Text>
            <Text style={styles.emptyHint}>Tocca il pulsante + per aggiungerne una</Text>
          </View>
        ) : (
          <FlatList
            data={tessere}
            renderItem={renderCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalPreset(true)} activeOpacity={0.85}>
        <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.fabInner}>
          <Text style={styles.fabText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* ---- MODAL DETTAGLIO ---- */}
      <Modal visible={!!selectedCard} transparent animationType="slide" onRequestClose={() => setSelectedCard(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheetLarge}>
            {selectedCard && (
              <>
                <LinearGradient
                  colors={selectedCard.gradient}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.detailCard}>
                  <Text style={styles.detailEmoji}>{selectedCard.emoji}</Text>
                  <Text style={styles.detailNome}>{selectedCard.nome}</Text>
                  <Text style={styles.detailTipo}>{selectedCard.tipo}</Text>
                  <Text style={styles.detailNumero}>{formatCode(selectedCard.numero)}</Text>
                  <View style={[styles.barcodeWrap, {marginTop: 20}]}>
                    {renderBarcodeLines(selectedCard.numero)}
                  </View>
                </LinearGradient>

                <TouchableOpacity
                  style={styles.btnDelete}
                  onPress={() => deleteTessera(selectedCard.id)}>
                  <Text style={styles.btnDeleteText}>🗑  Elimina tessera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnClose}
                  onPress={() => setSelectedCard(null)}>
                  <Text style={styles.btnCloseText}>Chiudi</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ---- MODAL PRESET ---- */}
      <Modal visible={modalPreset} transparent animationType="slide" onRequestClose={() => setModalPreset(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheetLarge}>
            <Text style={styles.sheetTitle}>Seleziona tessera</Text>
            <FlatList
              data={CARD_PRESETS}
              numColumns={2}
              keyExtractor={(_, i) => i.toString()}
              style={{maxHeight: height * 0.55}}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.presetItem}
                  onPress={() => selectPreset(item)}
                  activeOpacity={0.8}>
                  <LinearGradient colors={item.gradient} style={styles.presetGrad}>
                    <Text style={styles.presetEmoji}>{item.emoji}</Text>
                    <Text style={styles.presetNome}>{item.nome}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.btnManual}
              onPress={() => {
                setForm({nome: '', numero: '', tipo: 'Altro', gradient: ['#7F00FF', '#E100FF'], emoji: '💳'});
                setModalPreset(false);
                setModalAdd(true);
              }}>
              <Text style={styles.btnManualText}>✏️  Aggiungi manualmente</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalPreset(false)}>
              <Text style={styles.cancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ---- MODAL AGGIUNGI ---- */}
      <Modal visible={modalAdd} transparent animationType="slide" onRequestClose={() => setModalAdd(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Nuova tessera</Text>

            <View style={styles.previewMini}>
              <LinearGradient colors={form.gradient} style={styles.previewGrad}>
                <Text style={styles.previewEmoji}>{form.emoji}</Text>
                <Text style={styles.previewNome}>{form.nome || 'Nome tessera'}</Text>
                <Text style={styles.previewNumero}>{form.numero ? formatCode(form.numero) : '0000 0000 0000'}</Text>
              </LinearGradient>
            </View>

            <Text style={styles.inputLabel}>Nome</Text>
            <TextInput
              style={styles.input}
              value={form.nome}
              onChangeText={t => setForm({...form, nome: t})}
              placeholder="Es. Esselunga"
              placeholderTextColor="#555"
            />

            <Text style={styles.inputLabel}>Numero / Codice</Text>
            <TextInput
              style={styles.input}
              value={form.numero}
              onChangeText={t => setForm({...form, numero: t})}
              placeholder="Inserisci il codice a barre"
              placeholderTextColor="#555"
              keyboardType="default"
              autoCorrect={false}
            />

            <TouchableOpacity style={styles.btnConfirm} onPress={addTessera}>
              <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.btnConfirmInner}>
                <Text style={styles.btnConfirmText}>Salva Tessera</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalAdd(false)}>
              <Text style={styles.cancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {
    paddingTop:
      Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 28) + 12,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  appTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  pageTitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
    fontWeight: '500',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    paddingTop: 4,
  },
  cardWrapper: {
    marginBottom: 16,
    borderRadius: 22,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  card: {
    borderRadius: 22,
    padding: 22,
    minHeight: 150,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardEmoji: {fontSize: 30},
  cardTipo: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1.8,
    fontWeight: '700',
  },
  cardNome: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  cardNumero: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  barcodeWrap: {opacity: 0.9},
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  emptyEmoji: {fontSize: 72},
  emptyTitle: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '700',
    marginTop: 20,
  },
  emptyHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 86,
    right: 24,
    borderRadius: 32,
    elevation: 12,
    shadowColor: '#FFD700',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  fabInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {fontSize: 34, color: '#1A1A2E', fontWeight: '800', lineHeight: 38},
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  sheetLarge: {
    backgroundColor: '#12122A',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: height * 0.88,
  },
  sheet: {
    backgroundColor: '#12122A',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  previewMini: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
  },
  previewGrad: {
    padding: 20,
    borderRadius: 16,
  },
  previewEmoji: {fontSize: 28, marginBottom: 6},
  previewNome: {fontSize: 20, fontWeight: '800', color: '#fff'},
  previewNumero: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 2,
    marginTop: 4,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  btnConfirm: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 14,
    elevation: 6,
  },
  btnConfirmInner: {padding: 18, alignItems: 'center'},
  btnConfirmText: {color: '#1A1A2E', fontSize: 17, fontWeight: '800'},
  cancelText: {
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    padding: 14,
    fontSize: 15,
  },
  detailCard: {
    borderRadius: 22,
    padding: 28,
    marginBottom: 20,
  },
  detailEmoji: {fontSize: 44, marginBottom: 10},
  detailNome: {fontSize: 28, fontWeight: '800', color: '#fff'},
  detailTipo: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  detailNumero: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 3,
    marginTop: 10,
  },
  btnDelete: {
    backgroundColor: 'rgba(255,59,48,0.12)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.28)',
  },
  btnDeleteText: {color: '#FF6B6B', fontSize: 16, fontWeight: '700'},
  btnClose: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  btnCloseText: {color: '#fff', fontSize: 16, fontWeight: '600'},
  presetItem: {
    flex: 1,
    margin: 6,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
  },
  presetGrad: {
    padding: 18,
    alignItems: 'center',
    borderRadius: 16,
  },
  presetEmoji: {fontSize: 30},
  presetNome: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  btnManual: {
    backgroundColor: 'rgba(108,99,255,0.2)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.4)',
  },
  btnManualText: {color: '#A78BFA', fontWeight: '700', fontSize: 15},
});
