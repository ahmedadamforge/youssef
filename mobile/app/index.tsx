import { Link } from 'expo-router'
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native'

const summary = [{ label: 'Active loans', value: '03' }, { label: 'Club points', value: '840' }, { label: 'Next workshop', value: '02d' }]

export default function MobileHome() {
  return (
    <SafeAreaView className="flex-1 bg-ink">
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="mb-8 mt-5 flex-row items-start justify-between"><View><Text className="text-[10px] font-bold tracking-[3px] text-cyan">CMC ROBOTICS / RABAT</Text><Text className="mt-3 text-3xl font-medium tracking-[-1px] text-white">Your lab pulse<Text className="text-cyan">.</Text></Text></View><View className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5"><Text className="text-lg text-fog">◌</Text></View></View>
        <View className="mb-7 flex-row gap-2">{summary.map((item) => <View key={item.label} className="flex-1 rounded-2xl border border-white/10 bg-panel p-3"><Text className="text-[10px] uppercase tracking-wider text-muted">{item.label}</Text><Text className="mt-3 text-xl text-white">{item.value}</Text></View>)}</View>
        <View className="mb-4 flex-row items-end justify-between"><View><Text className="text-[10px] font-bold tracking-[2px] text-cyan">INVENTORY / QUICK BORROW</Text><Text className="mt-2 text-xl text-white">What do you need?</Text></View><Link href="/inventory" asChild><Pressable><Text className="text-xs text-cyan">View all ↗</Text></Pressable></Link></View>
        <View className="gap-3">{[['Ultrasonic HC-SR04', '12 available', 'SENSOR'], ['Micro servo SG90', '08 available', 'ACTUATOR'], ['ESP32 DevKit', '04 available', 'CONTROLLER']].map(([name, stock, type]) => <View key={name} className="flex-row items-center rounded-2xl border border-white/10 bg-white/[.035] p-4"><View className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-cyan/10"><Text className="text-lg text-cyan">⊙</Text></View><View className="flex-1"><Text className="text-sm text-white">{name}</Text><Text className="mt-1 text-xs text-muted">{type} · {stock}</Text></View><Text className="text-lg text-muted">›</Text></View>)}</View>
        <View className="mb-4 mt-8 flex-row items-end justify-between"><View><Text className="text-[10px] font-bold tracking-[2px] text-cyan">MEMBER PROFILE</Text><Text className="mt-2 text-xl text-white">Keep building, Adam.</Text></View><Link href="/profile" asChild><Pressable><Text className="text-xs text-cyan">Open profile ↗</Text></Pressable></Link></View>
        <View className="flex-row items-center rounded-2xl border border-cyan/20 bg-cyan/10 p-4"><View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-cyan"><Text className="font-bold text-ink">AB</Text></View><View className="flex-1"><Text className="text-sm text-white">Adam Benchrif</Text><Text className="mt-1 text-xs text-muted">Builder · Level 04</Text></View><Text className="font-mono text-sm text-cyan">840 pts</Text></View>
      </ScrollView>
    </SafeAreaView>
  )
}
