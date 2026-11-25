import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useProfile } from "@/profile/profile-context";
import { colors } from "@/ui/theme";

const Index = () => {
  const { ready, child } = useProfile();
  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky }}>
        <ActivityIndicator size="large" color={colors.sea} />
      </View>
    );
  }
  return <Redirect href={child ? "/island" : "/onboarding"} />;
};

export default Index;
