import { useNavigate } from "react-router-dom";
import welcomePageStar from "../assets/welcome_page_star.png";
import logo from "../assets/logo_light_mode.png";

export const WelcomePage = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      <section className="min-h-screen w-full bg-transparent overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://i.pinimg.com/1200x/be/f8/b0/bef8b0adaa3747225bd798d5a65a14e0.jpg')] bg-cover bg-center bg-no-repeat"></div>

        <div className="absolute top-8 left-10 flex items-center z-50">
          <img src={logo} alt="GiftSense Logo" className="h-12 w-auto" />
          <span className="ml-3 text-neutral-700 dark:text-neutral-700 font-semibold text-xl tracking-tight font-poppins">GiftSense</span>
        </div>

        {/* Top Nav */}
        <nav className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-6 items-center rounded-full backdrop-blur-md bg-white/40 px-6 py-2 text-sm z-20 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <a href="#features" className="text-[#2B2B2B] hover:text-[#2B2B2B]/80 transition">Features</a>
          <a href="#pricing" className="text-[#2B2B2B] hover:text-[#2B2B2B]/80 transition">Pricing</a>
          <a href="#about" className="text-[#2B2B2B] hover:text-[#2B2B2B]/80 transition">About us</a>
          <button className="rounded-full bg-[#ff9460] text-white px-4 py-1.5 font-semibold hover:shadow transition" aria-label="Get started" onClick={() => navigate("/chatbot")}>
          Get started
          </button>
        </nav>

        {/* Main Content */}
        <div className="relative z-10 flex justify-center items-center min-h-screen px-10 md:px-20 lg:px-32">
          <div className="w-full max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="w-full md:w-[55%] text-left">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 rounded-full backdrop-blur-md bg-white/40 px-3 py-1 text-xs tracking-wide text-[#2B2B2B] mb-6">
                  Gift smarter. Buy better.
                </div>

                {/* Heading */}
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.15] tracking-normal text-left" style={{ fontFamily: 'Fraunces' }}>
                  <span className="text-[#1A1A1A]">AI-Powered Gift Ideas</span><br/>
                  <span className="text-[#1A1A1A]">That Adapt to You</span>
                </h1>

                {/* Subheading */}
                <p className="mt-6 text-lg md:text-xl text-[#2B2B2B] max-w-xl text-left">
                  Analyze your preferences, budget, and occasion to recommend the perfect gifts tailored just for you.
                </p>

                {/* Primary CTA */}
                <button className="mt-8 inline-flex items-center gap-2 rounded-full bg-white text-[#2B2B2B] px-6 py-3 font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-lg active:scale-[0.99] transition" aria-label="Try it free" onClick={() => navigate("/chatbot")}>
                Try it free
                <span className="rounded-full bg-[#ff9460] p-1">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
              </div>
              <div className="w-full md:w-[45%]">
                {/* Image placeholder */}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 mt-10">
              <div className="backdrop-blur-[8px] rounded-[12px] py-3 px-4 flex flex-col justify-center items-center shadow-[0px_8px_24px_rgba(0,0,0,0.12)] min-h-[70px]" style={{ backgroundColor: 'rgba(255, 240, 230, 0.55)', border: '1px solid rgba(255, 255, 255, 0.3)' }}>
              <div className="text-3xl font-semibold text-[#3A3A3A]">92%</div>
              <div className="text-sm font-normal text-[#3A3A3A]/80 text-center">Users found better gifts</div>
              </div>
              <div className="backdrop-blur-[8px] rounded-[12px] py-3 px-4 flex flex-col justify-center items-center shadow-[0px_8px_24px_rgba(0,0,0,0.12)] min-h-[70px]" style={{ backgroundColor: 'rgba(255, 240, 230, 0.55)', border: '1px solid rgba(255, 255, 255, 0.3)' }}>
              <div className="text-3xl font-semibold text-[#3A3A3A]">24/7</div>
              <div className="text-sm font-normal text-[#3A3A3A]/80 text-center">Real-time curation</div>
              </div>
              <div className="backdrop-blur-[8px] rounded-[12px] py-3 px-4 flex flex-col justify-center items-center shadow-[0px_8px_24px_rgba(0,0,0,0.12)] min-h-[70px]" style={{ backgroundColor: 'rgba(255, 240, 230, 0.55)', border: '1px solid rgba(255, 255, 255, 0.3)' }}>
              <div className="text-3xl font-semibold text-[#3A3A3A]">+3x</div>
              <div className="text-sm font-normal text-[#3A3A3A]/80 text-center">Faster decision making</div>
              </div>
            </div>
          </div>
          <img
            src={welcomePageStar}
            alt="Decorative star"
            className="absolute top-1/2 right-10 transform -translate-y-1/2 w-24 md:w-80 opacity-90 drop-shadow-lg"
          />
        </div>
      </section>
    </>
  );
};
