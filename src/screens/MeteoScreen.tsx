import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  StatusBar,
  PermissionsAndroid,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Geolocation from 'react-native-geolocation-service';
import axios from 'axios';

interface Previsione {
  giorno: string;
  min: number;
  max: number;
  icona: string;
  descrizione: string;
}

interface WeatherData {
  citta: string;
  temperatura: number;
  descrizione: string;
  umidita: number;
  vento: number;
  icona: string;
  previsioni: Previsione[];
}

const wmoToDesc = (code: number): string => {
  if (code === 0) return 'Sereno';
  if (code <= 2) return 'Poco nuvoloso';
  if (code === 3) return 'Coperto';
  if (code <= 48) return 'Nebbia';
  if (code <= 55) return 'Pioggerella';
  if (code <= 67) return 'Pioggia';
  if (code <= 77) return 'Neve';
  if (code <= 82) return 'Rovesci';
  if (code <= 99) return 'Temporale';
  return 'Variabile';
};

const wmoToIcon = (code: number): string => {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code === 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 55) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code <= 99) return '⛈️';
  return '🌤️';
};

const bgForDesc = (desc: string): [string, string] => {
  const d = desc.toLowerCase();
  if (d.includes('sereno') || d.includes('poco')) return ['#1a6699', '#56CCF2'];
  if (d.includes('coperto')) return ['#4A4A6A', '#7B7BA0'];
  if (d.includes('pioggia') || d.includes('rovesc')) return ['#2C3E50', '#3498DB'];
  if (d.includes('neve')) return ['#7f8c8d', '#bdc3c7'];
  if (d.includes('temporale')) return ['#0f0c29', '#302b63'];
  if (d.includes('nebbia')) return ['#606c88', '#3f4c6b'];
  return ['#1A1A2E', '#16213E'];
};

const GIORNI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

export default function MeteoScreen() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = async () => {
    setLoading(true);
    setError(null);

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Posizione',
          message: 'Stella ha bisogno della tua posizione per il meteo.',
          buttonPositive: 'OK',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        fetchByCity('Roma');
        return;
      }
    }

    Geolocation.getCurrentPosition(
      pos => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
      () => fetchByCity('Roma'),
      {enableHighAccuracy: true, timeout: 12000, maximumAge: 120000},
    );
  };

  const fetchByCoords = async (lat: number, lon: number) => {
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=it`,
        {headers: {'User-Agent': 'StellaApp/1.0'}, timeout: 8000},
      );
      const addr = res.data.address;
      const city =
        addr?.city || addr?.town || addr?.village || addr?.county || 'Italia';
      await fetchByCity(city);
    } catch {
      await fetchByCity('Roma');
    }
  };

  const fetchByCity = async (city: string) => {
    try {
      const geoRes = await axios.get(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=it&format=json`,
        {timeout: 8000},
      );
      if (!geoRes.data.results?.length) throw new Error('not found');

      const {latitude, longitude, name} = geoRes.data.results[0];

      const meteoRes = await axios.get(
        `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${latitude}&longitude=${longitude}` +
          `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
          `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
          `&timezone=Europe/Rome&forecast_days=4`,
        {timeout: 8000},
      );

      const cur = meteoRes.data.current;
      const daily = meteoRes.data.daily;

      const previsioni: Previsione[] = daily.time
        .slice(1, 4)
        .map((dateStr: string, i: number) => ({
          giorno: GIORNI[new Date(dateStr).getDay()],
          min: Math.round(daily.temperature_2m_min[i + 1]),
          max: Math.round(daily.temperature_2m_max[i + 1]),
          icona: wmoToIcon(daily.weather_code[i + 1]),
          descrizione: wmoToDesc(daily.weather_code[i + 1]),
        }));

      setWeather({
        citta: name,
        temperatura: Math.round(cur.temperature_2m),
        descrizione: wmoToDesc(cur.weather_code),
        umidita: cur.relative_humidity_2m,
        vento: Math.round(cur.wind_speed_10m),
        icona: wmoToIcon(cur.weather_code),
        previsioni,
      });
      setLastUpdate(
        new Date().toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'}),
      );
      Animated.timing(fadeAnim, {toValue: 1, duration: 600, useNativeDriver: true}).start();
    } catch {
      setError('Impossibile caricare il meteo.\nControlla la connessione.');
    } finally {
      setLoading(false);
    }
  };

  const bgColors = weather ? bgForDesc(weather.descrizione) : (['#1A1A2E', '#16213E'] as [string, string]);

  return (
    <LinearGradient colors={bgColors} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={bgColors[0]} />

      <View style={styles.header}>
        <Text style={styles.appTitle}>✨ Stella</Text>
        <Text style={styles.pageTitle}>Meteo</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Rilevando la posizione…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>🌩️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchLocation}>
            <Text style={styles.retryText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      ) : weather ? (
        <Animated.View style={{flex: 1, opacity: fadeAnim}}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}>

            {/* Card principale */}
            <View style={styles.mainCard}>
              <Text style={styles.cityName}>📍 {weather.citta}</Text>
              <Text style={styles.weatherIcon}>{weather.icona}</Text>
              <Text style={styles.temperature}>{weather.temperatura}°</Text>
              <Text style={styles.description}>{weather.descrizione}</Text>

              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailIcon}>💧</Text>
                  <Text style={styles.detailValue}>{weather.umidita}%</Text>
                  <Text style={styles.detailLabel}>Umidità</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.detailItem}>
                  <Text style={styles.detailIcon}>💨</Text>
                  <Text style={styles.detailValue}>{weather.vento} km/h</Text>
                  <Text style={styles.detailLabel}>Vento</Text>
                </View>
              </View>
            </View>

            {/* Previsioni 3 giorni */}
            <Text style={styles.forecastTitle}>Prossimi 3 giorni</Text>
            {weather.previsioni.map((p, i) => (
              <View key={i} style={styles.forecastRow}>
                <Text style={styles.forecastDay}>{p.giorno}</Text>
                <Text style={styles.forecastIcon}>{p.icona}</Text>
                <Text style={styles.forecastDesc}>{p.descrizione}</Text>
                <View style={styles.forecastTemps}>
                  <Text style={styles.forecastMax}>{p.max}°</Text>
                  <Text style={styles.forecastMin}>{p.min}°</Text>
                </View>
              </View>
            ))}

            <Text style={styles.updateText}>Aggiornato alle {lastUpdate}</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={fetchLocation}>
              <Text style={styles.refreshText}>🔄  Aggiorna posizione</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      ) : null}
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
  appTitle: {fontSize: 30, fontWeight: '800', color: '#FFD700', letterSpacing: 0.5},
  pageTitle: {fontSize: 15, color: 'rgba(255,255,255,0.5)', marginTop: 2, fontWeight: '500'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  loadingText: {color: 'rgba(255,255,255,0.6)', marginTop: 18, fontSize: 16},
  errorEmoji: {fontSize: 72},
  errorText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 36,
    fontSize: 16,
    lineHeight: 24,
  },
  retryBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingHorizontal: 36,
    paddingVertical: 14,
    marginTop: 28,
  },
  retryText: {color: '#1A1A2E', fontWeight: '800', fontSize: 16},
  scroll: {paddingHorizontal: 16, paddingBottom: 110},
  mainCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  cityName: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
  },
  weatherIcon: {fontSize: 88},
  temperature: {
    fontSize: 80,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 88,
    marginTop: 4,
  },
  description: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 10,
    fontWeight: '500',
  },
  detailsRow: {
    flexDirection: 'row',
    marginTop: 28,
    alignItems: 'center',
    width: '100%',
  },
  detailItem: {alignItems: 'center', flex: 1},
  divider: {width: 1, height: 48, backgroundColor: 'rgba(255,255,255,0.2)'},
  detailIcon: {fontSize: 26},
  detailValue: {fontSize: 20, color: '#fff', fontWeight: '700', marginTop: 6},
  detailLabel: {fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 3},
  forecastTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  forecastRow: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  forecastDay: {color: '#fff', fontWeight: '700', fontSize: 16, width: 44},
  forecastIcon: {fontSize: 28, marginHorizontal: 12},
  forecastDesc: {flex: 1, color: 'rgba(255,255,255,0.65)', fontSize: 14},
  forecastTemps: {alignItems: 'flex-end'},
  forecastMax: {color: '#fff', fontWeight: '700', fontSize: 18},
  forecastMin: {color: 'rgba(255,255,255,0.45)', fontSize: 14, marginTop: 2},
  updateText: {
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 22,
    fontSize: 12,
  },
  refreshBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  refreshText: {color: '#fff', fontSize: 15, fontWeight: '600'},
});
