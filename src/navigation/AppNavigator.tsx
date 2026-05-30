import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View, Text, StyleSheet, Platform} from 'react-native';
import TessereScreen from '../screens/TessereScreen';
import MeteoScreen from '../screens/MeteoScreen';
import GossipScreen from '../screens/GossipScreen';

const Tab = createBottomTabNavigator();

const TabIcon = ({emoji, label, focused}: {emoji: string; label: string; focused: boolean}) => (
  <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
    <Text style={[styles.emoji, focused && styles.emojiFocused]}>{emoji}</Text>
    <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
  </View>
);

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      }}>
      <Tab.Screen
        name="Tessere"
        component={TessereScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon emoji="💳" label="Tessere" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Meteo"
        component={MeteoScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon emoji="🌤" label="Meteo" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Gossip"
        component={GossipScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon emoji="✨" label="Gossip" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0D0D1A',
    borderTopColor: 'rgba(108,99,255,0.25)',
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 6,
    elevation: 20,
    shadowColor: '#6C63FF',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  tabIcon: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tabIconFocused: {},
  emoji: {fontSize: 22, opacity: 0.5},
  emojiFocused: {opacity: 1},
  tabLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 3,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tabLabelFocused: {
    color: '#FFD700',
  },
});
