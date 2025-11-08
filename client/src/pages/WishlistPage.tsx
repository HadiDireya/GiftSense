import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, NavLink } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ProductCard } from "../components/ProductCard";
import { fetchMe, fetchWishlist, type NormalizedProduct } from "../lib/api";
import { AuthButton } from "../components/AuthButton";
import { ThemeToggle } from "../components/ThemeToggle";
import { useTheme } from "../state/theme";
import logoLight from "../assets/logo_light_mode.png";
import logoDark from "../assets/logo_dark_mode.png";

export const WishlistPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme } = useTheme();

  const { data: user, isPending: isUserPending } = useQuery({
  queryKey: ["me"],
  queryFn: fetchMe,
  });

  const {
  data = [],
  isLoading,
  isError,
  } = useQuery<NormalizedProduct[]>({
  queryKey: ["wishlist", user?.id ?? "guest"],
  queryFn: fetchWishlist,
  placeholderData: [],
  enabled: Boolean(user),
  });

  const handleClearWishlist = () => {
    const confirmed = window.confirm("Are you sure you want to clear your Wish List?");
    if (!confirmed) return;

    // Clear the wishlist state
    queryClient.setQueryData(['wishlist', user?.id ?? 'guest'], []);

    // Reset localStorage or persistent storage
    localStorage.removeItem("wishlist");

    // Also reset any saved 'liked' flags
    const allProducts = JSON.parse(localStorage.getItem("products") || "[]");
    const updatedProducts = allProducts.map((p) => ({
      ...p,
      liked: false,
    }));
    localStorage.setItem("products", JSON.stringify(updatedProducts));

  };

  if (isLoading || isUserPending) {
  return (
  <div className="min-h-screen text-slate-900 transition dark:text-slate-100">
  <div className="absolute top-0 left-0 w-full h-full bg-cover bg-center bg-no-repeat bg-fixed z-0 bg-[url('https://i.pinimg.com/736x/68/33/8c/68338cd5c0676ba1e0b0da81a0049d5f.jpg')] dark:bg-[url('https://i.pinimg.com/736x/a2/92/12/a2921200af9cca8afc2f2cb4e78b63cc.jpg')]"></div>
  <div className="relative z-10">
  <div className="h-screen flex justify-center items-center p-4">
  <div className="flex flex-col w-full h-full max-h-[90vh] max-w-7xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden mx-auto">
  <div className="flex-1 flex justify-center items-center p-6">
  <div className="text-center">
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 py-6 md:py-8">
  {[...Array(3)].map((_, index) => (
  <div
      key={index}
        className="h-96 animate-pulse rounded-2xl bg-white dark:bg-neutral-900 shadow-lg"
        />
        ))}
        </div>
        </div>
        </div>
            </div>
    </div>

  <button
    onClick={() => navigate("/chatbot")}
      className="lg:hidden fixed top-6 right-6 z-30 p-3 rounded-full bg-gradient-to-r from-[#FF9A63] to-[#FF7C39] dark:from-[#FF6933] dark:to-[#FF4800] text-white shadow-lg hover:scale-110 transition-all duration-200 flex items-center justify-center"
    aria-label="Start new chat"
  >
  <svg
    className="w-5 h-5 opacity-80 hover:opacity-100 transition"
    fill="none"
      stroke="currentColor"
    viewBox="0 0 24 24"
    >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        </button>
        </div>
      </div>
    );
  }

  if (isError) {
  return (
  <div className="min-h-screen text-slate-900 transition dark:text-slate-100">
  <div className="absolute top-0 left-0 w-full h-full bg-cover bg-center bg-no-repeat bg-fixed z-0 bg-[url('https://i.pinimg.com/736x/68/33/8c/68338cd5c0676ba1e0b0da81a0049d5f.jpg')] dark:bg-[url('https://i.pinimg.com/736x/a2/92/12/a2921200af9cca8afc2f2cb4e78b63cc.jpg')]"></div>
  <div className="relative z-10">
  <div className="h-screen flex justify-center items-center p-4">
  <div className="flex flex-col w-full h-full max-h-[90vh] max-w-7xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden mx-auto">
  <div className="flex-1 flex justify-center items-center p-6">
  <EmptyState
    title="Wish list unavailable"
    description="I couldn't load your saved picks. Try refreshing or returning to the chat."
    action={
      <button
        type="button"
        onClick={() => navigate("/chatbot")}
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-400 to-blue-600 text-white font-medium shadow-md hover:scale-105 transition"
      >
        Back to chat
      </button>
    }
  />
  </div>
  </div>
  </div>
  </div>
  </div>
  );
  }

  if (!data || data.length === 0) {
  return (
  <div className="min-h-screen text-slate-900 transition dark:text-slate-100">
  <div className="absolute top-0 left-0 w-full h-full bg-cover bg-center bg-no-repeat bg-fixed z-0 bg-[url('https://i.pinimg.com/736x/68/33/8c/68338cd5c0676ba1e0b0da81a0049d5f.jpg')] dark:bg-[url('https://i.pinimg.com/736x/a2/92/12/a2921200af9cca8afc2f2cb4e78b63cc.jpg')]"></div>
  <div className="relative z-10">
  <div className="h-screen flex justify-center items-center p-4">
  <div className="flex flex-col w-full h-full max-h-[90vh] max-w-7xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden mx-auto">
  <div className="flex-1 flex justify-center items-center p-6">
  <div className="flex flex-col items-center justify-center text-center space-y-3">
  <h2 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
  No saved gifts yet
  </h2>
  <p className="text-neutral-600 dark:text-neutral-400">
  Tap "Save to Wish List" in the chat to store gift ideas here.
  </p>
  <button
  type="button"
  onClick={() => navigate("/chatbot")}
  className="mt-4 px-6 py-2 rounded-full text-white font-medium shadow-md transition-transform duration-200 transform hover:scale-105 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 dark:from-orange-400 dark:to-orange-500"
  >
  Start Shopping
  </button>
  </div>
  </div>
  </div>
  </div>
  </div>
  </div>
  );
  }

 return (
  <div className="min-h-screen text-slate-900 transition dark:text-slate-100">
    <div className="absolute top-0 left-0 w-full h-full bg-cover bg-center bg-no-repeat bg-fixed z-0 bg-[url('https://i.pinimg.com/736x/68/33/8c/68338cd5c0676ba1e0b0da81a0049d5f.jpg')] dark:bg-[url('https://i.pinimg.com/736x/a2/92/12/a2921200af9cca8afc2f2cb4e78b63cc.jpg')]"></div>

    <div className="absolute top-8 left-10 z-40">
      <span className="text-white dark:text-black font-semibold text-2xl tracking-tight font-poppins">
        GiftSense
      </span>
    </div>

   <div className="relative z-10 h-screen flex justify-center items-center py-4 px-0">
   <div className="flex h-full w-[100%] bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden mt-[-2rem]">

        <div className="flex-1 flex flex-col bg-white dark:bg-neutral-900">
          <header className="shrink-0 px-6 py-6 border-b border-black/10 dark:border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={theme === "dark" ? logoDark : logoLight}
                  alt="GiftSense Logo"
                  className="h-20 w-auto"
                />
                <NavLink
                  to="/chatbot"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 shadow-sm transition-all duration-200 hover:scale-105"
                >
                  <svg
                    className="w-4 h-4 opacity-80 hover:opacity-100 transition"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Chat
                </NavLink>
              </div>

              <NavLink
                to="/wishlist"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-gradient-to-r from-[#FF9A63] to-[#FF7C39] dark:from-[#FF6933] dark:to-[#FF4800] text-white shadow-md transition-all duration-200 hover:scale-105"
              >
                <svg
                  className="w-4 h-4 opacity-80 hover:opacity-100 transition"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                Wish List
              </NavLink>

              <button
                onClick={handleClearWishlist}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 shadow-sm transition-all duration-200 hover:scale-105"
              >
                Clean
              </button>
            </div>

            <div className="flex items-center gap-3">
              <AuthButton />
              <ThemeToggle />
            </div>
          </header>

          <section className="flex-1 min-h-0 overflow-y-auto px-6 pt-6 pb-6 space-y-4">
            <div className="animate-fade-in">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6 mb-8 md:mt-10 md:mb-12">
                {data.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    explanation="Saved from chat."
                  />
                ))}
              </div>

              <section className="shrink-0 w-full flex flex-col items-center gap-1 py-6 border-t border-black/10 dark:border-white/10">
                <h1 className="text-gray-900 dark:text-gray-100 font-semibold text-2xl">
                  Wish List
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Ready to revisit these? Ask GiftSense to rework ideas using
                  your saved favorites.
                </p>
                <button className="px-5 py-1 rounded-lg font-medium bg-gradient-to-r from-[#ff9460] to-[#ff7c39] dark:from-[#ff6b2e] dark:to-[#ff4d1c] text-white shadow-soft transition-all duration-200 hover:scale-105 hover:brightness-110">
                  Reask with Wish List
                </button>
              </section>
            </div>
          </section>
        </div>
      </div>
    </div>

    {/* Single correct chat button */}
    <button
      onClick={() => navigate("/chatbot")}
      className="lg:hidden fixed top-6 right-6 z-30 p-3 rounded-full bg-gradient-to-r from-[#FF9A63] to-[#FF7C39] dark:from-[#FF6933] dark:to-[#FF4800] text-white shadow-lg hover:scale-110 transition-all duration-200 flex items-center justify-center"
      aria-label="Start new chat"
    >
      <svg
        className="w-5 h-5 opacity-80 hover:opacity-100 transition"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
    </button>
  </div>
);
};
