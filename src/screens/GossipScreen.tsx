import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar,
  RefreshControl,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';

interface GossipItem {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
}

const RSS_FEEDS = [
  {url: 'https://www.gossipetv.com/feed', source: 'GossipTV'},
  {url: 'https://tvblog.it/feed/', source: 'TVBlog'},
  {url: 'https://www.bitchyf.it/feed/', source: 'BitchyF'},
];

const ACCENTS: [string, string][] = [
  ['#FF6B6B', '#FF8E53'],
  ['#A855F7', '#EC4899'],
  ['#06B6D4', '#6366F1'],
  ['#10B981', '#3B82F6'],
  ['#F59E0B', '#EF4444'],
  ['#8B5CF6', '#EC4899'],
  ['#14B8A6', '#6366F1'],
  ['#F43F5E', '#FB923C'],
];

const parseDate = (s: string): string => {
  try {
    return new Date(s).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return s;
  }
};

const getTag = (xml: string, tag: string): string => {
  const m = xml.match(
    new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\/${tag}>`, 'i'),
  );
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
};

const parseRSS = (xml: string, source: string): GossipItem[] => {
  const items: GossipItem[] = [];
  const itemRx = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRx.exec(xml)) !== null) {
    const body = m[1];
    const title = getTag(body, 'title');
    const link = getTag(body, 'link');
    const desc = getTag(body, 'description').substring(0, 180);
    const pubDate = getTag(body, 'pubDate');
    if (title && link) {
      items.push({
        id: link + pubDate,
        title,
        description: desc,
        link,
        pubDate: parseDate(pubDate),
        source,
      });
    }
  }
  return items;
};

export default function GossipScreen() {
  const [items, setItems] = useState<GossipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    fetchGossip();
  }, []);

  const fetchGossip = useCallback(async () => {
    setError(null);
    const all: GossipItem[] = [];

    await Promise.allSettled(
      RSS_FEEDS.map(async ({url, source}) => {
        try {
          const res = await axios.get(url, {
            timeout: 12000,
            headers: {
              Accept: 'application/rss+xml,application/xml,text/xml,*/*',
              'User-Agent': 'StellaApp/1.0',
            },
          });
          all.push(...parseRSS(res.data, source));
        } catch (_) {}
      }),
    );

    if (all.length === 0) {
      setError(
        'Impossibile caricare le notizie.\nControlla la connessione e riprova.',
      );
    } else {
      const seen = new Set<string>();
      const unique = all.filter(it => {
        if (seen.has(it.id)) return false;
        seen.add(it.id);
        return true;
      });
      setItems(unique.slice(0, 40));
      Animated.timing(fadeAnim, {toValue: 1, duration: 500, useNativeDriver: true}).start();
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGossip();
  };

  const renderItem = ({item, index}: {item: GossipItem; index: number}) => {
    const accent = ACCENTS[index % ACCENTS.length];
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => Linking.openURL(item.link).catch(() => {})}
        activeOpacity={0.82}>
        <LinearGradient
          colors={accent}
          start={{x: 0, y: 0}}
          end={{x: 0, y: 1}}
          style={styles.colorStrip}
        />
        <View style={styles.cardBody}>
          <View style={styles.meta}>
            <Text style={styles.sourceChip}>{item.source}</Text>
            <Text style={styles.date}>{item.pubDate}</Text>
          </View>
          <Text style={styles.title} numberOfLines={3}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={styles.desc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={['#1A1A2E', '#16213E', '#2D1B4E']}
      style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />

      <View style={styles.header}>
        <Text style={styles.appTitle}>✨ Stella</Text>
        <Text style={styles.pageTitle}>Gossip &amp; Spettacolo</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Caricando le ultime notizie…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>📰</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchGossip(); }}>
            <Text style={styles.retryText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={{flex: 1, opacity: fadeAnim}}>
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={it => it.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FFD700"
                colors={['#FFD700']}
              />
            }
          />
        </Animated.View>
      )}
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
  list: {paddingHorizontal: 14, paddingBottom: 110, paddingTop: 4},
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  colorStrip: {width: 5},
  cardBody: {flex: 1, padding: 16},
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sourceChip: {
    backgroundColor: 'rgba(108,99,255,0.35)',
    color: '#C4B5FD',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 7,
    letterSpacing: 0.5,
    overflow: 'hidden',
  },
  date: {color: 'rgba(255,255,255,0.35)', fontSize: 11},
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 7,
  },
  desc: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    lineHeight: 19,
  },
});
