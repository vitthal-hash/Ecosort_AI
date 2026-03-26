import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./StudyMode.css";

const TOPICS = [
  { key: "recycling",         label: "Recycling",    icon: "♻️" },
  { key: "plastic",           label: "Plastic",      icon: "🧴" },
  { key: "climate",           label: "Climate",      icon: "🌍" },
  { key: "zero-waste",        label: "Zero Waste",   icon: "🌱" },
  { key: "biodegradable",     label: "Biodegradable",icon: "🍃" },
  { key: "energy",            label: "Energy",       icon: "⚡" },
];

// Curated articles per topic
const ALL_CARDS = {
  recycling: [
    { title: "The 3Rs: Reduce, Reuse, Recycle", summary: "The waste hierarchy starts with reducing consumption, then reusing, and finally recycling. Reduce and reuse have far greater environmental impact than recycling alone.", img: "https://images.unsplash.com/photo-1532996122724-e3c371b71f05?w=600&q=80", tag: "Fundamentals", readTime: "3 min", url: "https://www.epa.gov/recycle/reducing-and-reusing-basics" },
    { title: "How Recycling Actually Works", summary: "Recyclables are collected, sorted, cleaned, and processed into raw materials. Contamination is the #1 reason recycling fails — rinsing containers before disposal makes a huge difference.", img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80", tag: "Recycling", readTime: "4 min", url: "https://www.recyclenow.com/recycling-knowledge/how-is-it-recycled" },
    { title: "India's Waste Management Rules 2016", summary: "India's Solid Waste Management Rules mandate source segregation into wet, dry, and hazardous waste. ULBs must ensure door-to-door collection and scientific processing of all municipal waste.", img: "https://images.unsplash.com/photo-1532996122724-e3c371b71f05?w=600&q=80", tag: "India", readTime: "5 min", url: "https://swachhbharat.mygov.in" },
    { title: "Glass: Infinitely Recyclable", summary: "Glass can be melted and reformed endlessly with no quality loss. One tonne of recycled glass saves 315 kg of CO₂ and 1.2 tonnes of raw materials.", img: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=600&q=80", tag: "Glass", readTime: "3 min", url: "https://glassrecycling.co.uk" },
    { title: "The Aluminium Recycling Miracle", summary: "Recycling aluminium saves 95% of the energy needed to make new metal. One can recycled = enough energy to run a TV for 3 hours. Yet millions of cans go to landfill daily.", img: "https://images.unsplash.com/photo-1571687949921-1306bfb24b72?w=600&q=80", tag: "Metal", readTime: "4 min", url: "https://www.aluminum.org/sustainability" },
    { title: "Paper Recycling: Save 17 Trees per Tonne", summary: "Every tonne of recycled paper saves 17 trees, 7,000 gallons of water, and 4,100 kWh of electricity. Paper can be recycled 5–7 times before fibres are too short to use.", img: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80", tag: "Paper", readTime: "3 min", url: "https://www.paperrecycles.org" },
    { title: "The Circular Economy Explained", summary: "A circular economy eliminates waste by design — products are made to be repaired, refurbished, and recycled. The Ellen MacArthur Foundation estimates it could generate $4.5 trillion in value by 2030.", img: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&q=80", tag: "Economy", readTime: "5 min", url: "https://ellenmacarthurfoundation.org" },
    { title: "Indore: India's Cleanest City Secret", summary: "Indore has topped India's Swachh Survekshan 7 years running by enforcing strict waste segregation, door-to-door collection, and citizen awareness. Their model is now replicated nationwide.", img: "https://images.unsplash.com/photo-1532996122724-e3c371b71f05?w=600&q=80", tag: "India", readTime: "4 min", url: "https://swachhbharat.mygov.in" },
  ],
  plastic: [
    { title: "Why Plastic Takes 450 Years to Decompose", summary: "Plastic polymer chains resist microbial breakdown. UV light breaks them into microplastics under 5mm — particles now found in human blood, breast milk, and the deepest ocean trenches.", img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80", tag: "Plastic", readTime: "4 min", url: "https://www.nationalgeographic.com/environment/article/plastic-pollution" },
    { title: "The 7 Types of Plastic — Which Are Recyclable?", summary: "Only plastics labelled #1 (PET) and #2 (HDPE) are widely recyclable. Types #3–7 are rarely accepted. Check your local recycling guidelines before tossing plastic in the bin.", img: "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=600&q=80", tag: "Plastic", readTime: "5 min", url: "https://www.recyclenow.com/recycling-knowledge/what-to-do-with/plastic" },
    { title: "Ocean Plastic: 8 Million Tonnes a Year", summary: "An estimated 8 million tonnes of plastic enter the oceans annually. The Great Pacific Garbage Patch covers 1.6 million km² — twice the size of Texas. Seabirds, fish, and turtles ingest it daily.", img: "https://images.unsplash.com/photo-1572635148818-ef6fd45eb394?w=600&q=80", tag: "Ocean", readTime: "6 min", url: "https://www.oceancleanup.com" },
    { title: "Single-Use Plastics Ban in India", summary: "India banned 19 categories of single-use plastic items in 2022 including straws, cutlery, and ear buds. The ban aims to reduce the 3.4 million tonnes of plastic waste India generates annually.", img: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80", tag: "India", readTime: "4 min", url: "https://www.cpcb.nic.in" },
    { title: "Upcycling Plastic at Home", summary: "Plastic bottles can become planters, bird feeders, or storage containers. Plastic bags can be fused with an iron into 'plarn' for weaving. Small actions reduce landfill load significantly.", img: "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=600&q=80", tag: "Upcycle", readTime: "3 min", url: "https://www.terracycle.com/en-US/about-terracycle/our_company" },
    { title: "Microplastics in Our Food", summary: "Studies show humans ingest an average of 5g of microplastic per week — the weight of a credit card. They enter via seafood, salt, bottled water, and even air. Long-term health effects are still being studied.", img: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&q=80", tag: "Health", readTime: "5 min", url: "https://www.wwf.org.au/news/blogs/no-plastic-in-nature" },
  ],
  climate: [
    { title: "Waste and Climate Change: The Hidden Link", summary: "Landfills are the third-largest source of methane emissions — a greenhouse gas 25x more potent than CO₂. Proper waste management could cut global emissions by 20%.", img: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&q=80", tag: "Climate", readTime: "5 min", url: "https://www.ipcc.ch" },
    { title: "Composting vs Landfill: A CO₂ Story", summary: "Food in landfill decomposes anaerobically, producing methane. The same food composted at home produces CO₂ and nutrient-rich humus. Composting 1 kg of food waste prevents 0.5 kg of methane.", img: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80", tag: "Composting", readTime: "4 min", url: "https://www.epa.gov/recycle/composting-home" },
    { title: "India's Climate Pledges and Waste", summary: "India committed to net-zero by 2070 at COP26. Waste management is central — especially reducing methane from open dumping, which affects over 3,000 dump sites currently operating.", img: "https://images.unsplash.com/photo-1532996122724-e3c371b71f05?w=600&q=80", tag: "India", readTime: "5 min", url: "https://unfccc.int" },
    { title: "How Recycling Fights Climate Change", summary: "Manufacturing from recycled materials emits 30–95% less CO₂ than virgin production depending on the material. Collective recycling has the same climate impact as taking millions of cars off the road.", img: "https://images.unsplash.com/photo-1532996122724-e3c371b71f05?w=600&q=80", tag: "Recycling", readTime: "4 min", url: "https://www.climatecouncil.org.au" },
  ],
  "zero-waste": [
    { title: "Zero Waste: A Lifestyle Guide", summary: "Zero waste living aims to send nothing to landfill. The 5Rs framework — Refuse, Reduce, Reuse, Recycle, Rot — provides a daily practice for eliminating household waste step by step.", img: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&q=80", tag: "Lifestyle", readTime: "6 min", url: "https://zerowastehome.com" },
    { title: "Bea Johnson: The Pioneer of Zero Waste", summary: "Bea Johnson's family of 4 produces only 1 litre of landfill waste per year. Her book Zero Waste Home has been translated into 28 languages and inspired a global movement.", img: "https://images.unsplash.com/photo-1532996122724-e3c371b71f05?w=600&q=80", tag: "People", readTime: "4 min", url: "https://zerowastehome.com" },
    { title: "Zero Waste Shopping: The Basics", summary: "Bring reusable bags, containers, and produce bags. Buy in bulk. Choose products in glass or cardboard over plastic. Support stores with refill stations for staples like oil, grains, and cleaning products.", img: "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=600&q=80", tag: "Shopping", readTime: "4 min", url: "https://www.litterless.com" },
    { title: "Zero Waste in Indian Kitchens", summary: "Traditional Indian kitchens were virtually zero waste: stale roti became animal feed, vegetable peels went to compost, and everything was cooked-to-finish. Reviving these practices is easier than you think.", img: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80", tag: "India", readTime: "5 min", url: "https://www.downtoearth.org.in" },
  ],
  biodegradable: [
    { title: "What Does Biodegradable Actually Mean?", summary: "A material is biodegradable if microorganisms can break it down into natural substances. But 'biodegradable' plastics often need industrial composting conditions — not a home pile or landfill.", img: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&q=80", tag: "Science", readTime: "4 min", url: "https://www.bbc.co.uk/bitesize/topics/zx882hv/articles/z3c2ydm" },
    { title: "Home Composting: Turn Waste into Gold", summary: "Composting converts organic waste into nutrient-rich humus. A basic pile needs greens (food scraps, grass), browns (dry leaves, cardboard), moisture, and turning every 2 weeks.", img: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&q=80", tag: "Composting", readTime: "5 min", url: "https://www.epa.gov/recycle/composting-home" },
    { title: "Vermicomposting: Worms Do the Work", summary: "Red wigglers can process half their body weight in organic matter daily. A 1kg worm bin handles all kitchen scraps for a family of 4, producing high-quality castings for plants.", img: "https://images.unsplash.com/photo-1532996122724-e3c371b71f05?w=600&q=80", tag: "Composting", readTime: "4 min", url: "https://www.epa.gov/recycle/composting-home" },
    { title: "Biogas from Kitchen Waste", summary: "Biogas plants convert organic waste into cooking gas (methane) and liquid fertiliser. A family-scale plant (2 cubic metres) processes 5–6 kg of waste daily, saving LPG costs significantly.", img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80", tag: "Energy", readTime: "5 min", url: "https://mnre.gov.in" },
  ],
  energy: [
    { title: "Waste-to-Energy: Promise or Problem?", summary: "Waste-to-energy plants burn municipal waste to generate electricity. While they reduce landfill volume, critics argue they disincentivise recycling and produce toxic ash requiring careful disposal.", img: "https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=600&q=80", tag: "Energy", readTime: "5 min", url: "https://www.energy.gov/eere/bioenergy/waste-energy" },
    { title: "Solar Energy Savings vs Recycling", summary: "Installing a 3kW solar panel saves ~1,200 kg CO₂/year. Recycling all household waste saves ~400–600 kg CO₂/year. Together they slash a household's carbon footprint by over 50%.", img: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&q=80", tag: "Solar", readTime: "4 min", url: "https://www.irena.org" },
    { title: "Aluminium Recycling: 95% Energy Saved", summary: "The energy saved recycling one aluminium can could run a TV for 3 hours. Globally, aluminium recycling saves the equivalent of 100 million barrels of oil per year.", img: "https://images.unsplash.com/photo-1571687949921-1306bfb24b72?w=600&q=80", tag: "Aluminium", readTime: "3 min", url: "https://www.aluminum.org/sustainability" },
    { title: "India's Renewable Energy & Waste Goals", summary: "India aims for 500 GW renewable capacity by 2030. Municipal solid waste processing is integrated into smart city plans, with 150+ waste-to-compost and waste-to-energy plants commissioned.", img: "https://images.unsplash.com/photo-1532996122724-e3c371b71f05?w=600&q=80", tag: "India", readTime: "5 min", url: "https://mnre.gov.in" },
  ],
};

const FACTS = [
  "🌍 1 million plastic bottles bought every minute globally",
  "♻️ Recycling 1 aluminium can powers a TV for 3 hours",
  "🌊 8 million tonnes of plastic enter oceans every year",
  "🌱 Composting reduces household waste by up to 30%",
  "⚡ Glass recycling saves 30% energy vs virgin production",
  "📦 Cardboard can be recycled up to 7 times",
  "🧴 Only 9% of all plastic ever produced has been recycled",
  "🌳 Recycling 1 tonne of paper saves 17 trees",
];

export default function StudyMode() {
  const navigate = useNavigate();
  const [activeTopic, setActiveTopic] = useState("recycling");

  const cards = ALL_CARDS[activeTopic] || ALL_CARDS["recycling"];
  const hero  = cards[0];
  const grid  = cards.slice(1);

  return (
    <div className="study-root">
      <div className="study-header">
        <button className="study-back" onClick={() => navigate(-1)}>← Back</button>
        <div className="study-brand">
          <span>📰</span>
          <div>
            <div className="study-title">Study Mode</div>
            <div className="study-sub">Eco knowledge hub · curated guides</div>
          </div>
        </div>
        <button className="study-stats" onClick={() => navigate("/stats")}>📊 Stats</button>
      </div>

      {/* Topic tabs */}
      <div className="topic-tabs">
        {TOPICS.map(t => (
          <button
            key={t.key}
            className={"topic-tab" + (activeTopic === t.key ? " active" : "")}
            onClick={() => setActiveTopic(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Hero card */}
      {hero && (
        <a className="hero-card" href={hero.url} target="_blank" rel="noreferrer">
          <img src={hero.img} alt={hero.title} className="hero-img"
            onError={e => { e.target.src = "https://images.unsplash.com/photo-1532996122724-e3c371b71f05?w=800&q=80"; }} />
          <div className="hero-overlay">
            <div className="hero-tag">{hero.tag}</div>
            <h2 className="hero-title">{hero.title}</h2>
            <p className="hero-summary">{hero.summary}</p>
            <div className="hero-meta">
              <span>⏱ {hero.readTime} read</span>
              <span>↗ Read article</span>
            </div>
          </div>
        </a>
      )}

      {/* Article grid */}
      <div className="news-grid">
        {grid.map((article, i) => (
          <a
            key={article.title}
            className="news-card"
            href={article.url}
            target="_blank"
            rel="noreferrer"
            style={{ animationDelay: i * 0.05 + "s" }}
          >
            <div className="news-img-wrap">
              <img src={article.img} alt={article.title} className="news-img"
                onError={e => { e.target.src = "https://images.unsplash.com/photo-1532996122724-e3c371b71f05?w=400&q=80"; }} />
              <span className="news-tag">{article.tag}</span>
            </div>
            <div className="news-body">
              <div className="news-title">{article.title}</div>
              <div className="news-summary">{article.summary}</div>
              <div className="news-meta"><span>⏱ {article.readTime}</span></div>
            </div>
          </a>
        ))}
      </div>

      {/* Scrolling facts ticker */}
      <div className="facts-ticker">
        <div className="facts-inner">
          {[...FACTS, ...FACTS].map((f, i) => (
            <span key={i} className="fact-item">{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}