import { useNavigate } from "react-router";

import { RiCompass3Line } from "@remixicon/react";

import { EmptyState } from "../components/ui/List";
import { Screen } from "../components/ui/Screen";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Screen onBack={() => navigate(-1)} subtitle="链接可能已经失效" title="页面不存在">
      <EmptyState
        action={
          <button
            className="pressable bg-tint inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-[15px] font-semibold text-white"
            type="button"
            onClick={() => navigate("/", { replace: true })}
          >
            <RiCompass3Line size={17} />
            回到发现
          </button>
        }
        description="检查地址是否正确，或返回首页继续听歌"
        icon={<RiCompass3Line size={28} />}
        title="找不到这个页面"
      />
    </Screen>
  );
}
