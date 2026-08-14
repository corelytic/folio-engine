/* ==========================================================================
   FOLIO ENGINE — Project Library (start screen + templates)
   Exposes: window.FolioProjects
   ========================================================================== */
(function (global) {
  "use strict";

  var store = global.FolioStore;

  function B(type, props) { return Object.assign({ id: store.uid(), type: type }, props); }
  function P(title, blocks, hotspots) {
    return { id: store.uid(), title: title, blocks: blocks, hotspots: hotspots || [] };
  }

  /* ---------- Templates: genuinely different content, structure, theme ---------- */
  var TEMPLATES = {
    blank: {
      name: "Blank Publication", desc: "Start from an empty page.", pagesLabel: "1 page · Ivory",
      make: function () {
        var pr = store.baseProject("Untitled Publication", "ivory");
        pr.pages = [P("Page 1", [
          B("heading", { text: "Untitled publication" }),
          B("text", { text: "Add blocks from the inspector to shape your first page." })
        ])];
        return pr;
      }
    },
    restaurant: {
      name: "Restaurant Menu", desc: "Dishes, prices, chef's notes.", pagesLabel: "4 pages · Ivory",
      make: function () {
        var pr = store.baseProject("Maison Verte — Menu", "ivory");
        pr.pages = [
          P("Maison Verte", [
            B("heading", { text: "Maison Verte" }),
            B("text", { text: "Seasonal French kitchen · Est. 2019. Every dish built from what the market gave us this morning." }),
            B("quote", { text: "The menu you hold is alive — it changes with the seasons, and so do we.", cite: "Chef Amélie Fontaine" }),
            B("button", { label: "Reserve a table", url: "#contact" })
          ], [{ id: store.uid(), x: 80, y: 18, label: "Chef's note", text: "Interactive hotspots annotate anything — add your own from the right panel.", enabled: true }]),
          P("Starters", [
            B("heading", { text: "Starters" }),
            B("price", { item: "Soupe à l'oignon", desc: "Caramelized onions, gruyère crust", price: "$14" }),
            B("price", { item: "Burrata & heirloom tomato", desc: "Basil oil, aged balsamic", price: "$16" }),
            B("price", { item: "Escargots de Bourgogne", desc: "Garlic-parsley butter, six pieces", price: "$18" }),
            B("divider", {}),
            B("text", { text: "All starters are served with house sourdough and cultured butter." })
          ]),
          P("Mains", [
            B("heading", { text: "Mains" }),
            B("price", { item: "Duck breast à l'orange", desc: "Confit leg, charred endive", price: "$34" }),
            B("price", { item: "Wild sea bass", desc: "Fennel, saffron beurre blanc", price: "$38" }),
            B("price", { item: "Mushroom Wellington", desc: "Chestnut, truffle jus (plant-based)", price: "$29" }),
            B("divider", {}),
            B("cols", { left: "Wine pairings available for every main — ask your server.", right: "Tasting menu: five courses, $85 per guest. Full table only." })
          ]),
          P("Visit Us", [
            B("heading", { text: "Visit Us" }),
            B("text", { text: "12 Rue des Jardins · Tuesday–Sunday, 18:00–23:00. Private dining room available for parties of eight or more." }),
            B("button", { label: "Get directions", url: "#contact" })
          ])
        ];
        return pr;
      }
    },
    lookbook: {
      name: "Product Lookbook", desc: "Products, features, calls to action.", pagesLabel: "4 pages · Noir",
      make: function () {
        var pr = store.baseProject("North & Pine — Autumn Lookbook", "noir");
        pr.pages = [
          P("Cover", [
            B("heading", { text: "North & Pine" }),
            B("text", { text: "Autumn Collection — twelve pieces, built to outlast the season. Photographed in the field, priced without middlemen." }),
            B("button", { label: "Shop the collection", url: "#contact" })
          ], [{ id: store.uid(), x: 76, y: 24, label: "New", text: "This season introduces our first fully recycled wool line.", enabled: true }]),
          P("The Field Jacket", [
            B("heading", { text: "The Field Jacket" }),
            B("image", { src: "" }),
            B("cols", { left: "Waxed organic cotton shell. Corduroy-lined collar. Four bellows pockets.", right: "Cut for layering. Runs true to size. Guaranteed for ten years of repair." }),
            B("price", { item: "Field Jacket", desc: "Moss / Ochre / Charcoal", price: "$240" }),
            B("button", { label: "View product", url: "#contact" })
          ]),
          P("The Trail Boot", [
            B("heading", { text: "The Trail Boot" }),
            B("image", { src: "" }),
            B("price", { item: "Trail Boot", desc: "Full-grain leather, resoleable", price: "$310" }),
            B("quote", { text: "Wore them across three countries before the first polish.", cite: "Field tester, Norway" }),
            B("button", { label: "View product", url: "#contact" })
          ]),
          P("Care & Guarantee", [
            B("heading", { text: "Care & Guarantee" }),
            B("text", { text: "Every piece ships with a repair kit. Send anything back within ten years and we mend it free — that promise is the product." })
          ])
        ];
        return pr;
      }
    },
    brochure: {
      name: "Company Brochure", desc: "Services, results, contact.", pagesLabel: "4 pages · Azure",
      make: function () {
        var pr = store.baseProject("Ridgeline Consulting — Capabilities", "azure");
        pr.pages = [
          P("Who We Are", [
            B("heading", { text: "Ridgeline Consulting" }),
            B("text", { text: "Operations consulting for manufacturers with 50–500 employees. We work on the floor, not from the boardroom." }),
            B("quote", { text: "They found six figures of waste in the first month.", cite: "COO, Meridian Plastics" })
          ]),
          P("What We Do", [
            B("heading", { text: "What We Do" }),
            B("cols", { left: "Process audits. Throughput analysis. Line rebalancing. Inventory rightsizing.", right: "Team training. Standard-work documentation. 90-day implementation support." }),
            B("divider", {}),
            B("price", { item: "Discovery audit", desc: "Two weeks on site, full report", price: "$9,500" }),
            B("price", { item: "Implementation program", desc: "Quarterly engagement", price: "from $30k" })
          ]),
          P("Results", [
            B("heading", { text: "Results" }),
            B("text", { text: "Median client outcome across 40 engagements: 18% throughput increase within two quarters, with zero additional headcount." }),
            B("button", { label: "Read case studies", url: "#contact" })
          ]),
          P("Contact", [
            B("heading", { text: "Start a conversation" }),
            B("text", { text: "A thirty-minute call tells us both whether the fit is right. No deck, no pitch — bring your numbers." }),
            B("button", { label: "Book a call", url: "#contact" })
          ])
        ];
        return pr;
      }
    },
    travel: {
      name: "Travel Guide", desc: "Destinations, tips, itineraries.", pagesLabel: "4 pages · Azure",
      make: function () {
        var pr = store.baseProject("Lisbon in Three Days", "azure");
        pr.pages = [
          P("Lisbon in Three Days", [
            B("heading", { text: "Lisbon in Three Days", size: "l" }),
            B("text", { text: "A walkable capital of tiled facades, miradouros, and custard tarts. This guide compresses the essential city into one long weekend." }),
            B("stats", { items: [{ v: "3", l: "Days" }, { v: "12", l: "Stops" }, { v: "€180", l: "Budget/day" }] })
          ]),
          P("Day One — Alfama", [
            B("heading", { text: "Day One — Alfama" }),
            B("list", { items: ["Morning: Castelo de São Jorge before the queues", "Lunch: grilled sardines at a tasca off Rua de São Pedro", "Sunset: Miradouro das Portas do Sol"] }),
            B("quote", { text: "Get lost on purpose — Alfama rewards wrong turns.", cite: "Local guide" })
          ]),
          P("Day Two — Belém", [
            B("heading", { text: "Day Two — Belém" }),
            B("list", { items: ["Jerónimos Monastery (book ahead)", "Pastéis de Belém — eat two, warm", "MAAT along the riverfront"] }),
            B("button", { label: "Open transit map", url: "#contact" })
          ]),
          P("Know Before You Go", [
            B("heading", { text: "Know Before You Go" }),
            B("cols", { left: "Trams are cash-unfriendly — get a Viva Viagem card at any metro station.", right: "Hills are real: bring proper shoes and skip the rental scooters on cobbles." })
          ])
        ];
        return pr;
      }
    },
    realestate: {
      name: "Real Estate Showcase", desc: "Property, features, viewing CTA.", pagesLabel: "4 pages · Ivory",
      make: function () {
        var pr = store.baseProject("Villa Andarina — Private Listing", "ivory");
        pr.pages = [
          P("Villa Andarina", [
            B("heading", { text: "Villa Andarina", size: "l" }),
            B("text", { text: "A restored 1920s villa above the coast road — five minutes from the marina, a world away from it." }),
            B("stats", { items: [{ v: "420m²", l: "Interior" }, { v: "5", l: "Bedrooms" }, { v: "€2.4M", l: "Guide price" }] })
          ], [{ id: store.uid(), x: 78, y: 20, label: "Private", text: "Shown by appointment only — contact the listing agent.", enabled: true }]),
          P("The Property", [
            B("heading", { text: "The Property" }),
            B("image", { src: "" }),
            B("list", { items: ["Original stone façade, fully re-roofed 2023", "Chef's kitchen opening to a shaded terrace", "Salt-water pool with coastal view", "Independent guest annex"] })
          ]),
          P("Location", [
            B("heading", { text: "Location" }),
            B("cols", { left: "Marina & old town: 5 min. International school: 12 min. Airport: 40 min.", right: "The lane is private and deeded; two neighbouring parcels are protected greenbelt." })
          ]),
          P("Arrange a Viewing", [
            B("heading", { text: "Arrange a Viewing" }),
            B("text", { text: "Viewings are private and accompanied. Proof of funds requested for second visits." }),
            B("button", { label: "Contact listing agent", url: "#contact" })
          ])
        ];
        return pr;
      }
    },
    report: {
      name: "Annual Report", desc: "Results, highlights, outlook.", pagesLabel: "4 pages · Noir",
      make: function () {
        var pr = store.baseProject("Helios Group — Annual Report", "noir");
        pr.pages = [
          P("Annual Report", [
            B("heading", { text: "Helios Group", size: "l" }),
            B("text", { text: "Annual Report — a year of disciplined growth across all three operating divisions." }),
            B("stats", { items: [{ v: "+18%", l: "Revenue" }, { v: "€64M", l: "EBITDA" }, { v: "31", l: "Markets" }] })
          ]),
          P("Letter to Shareholders", [
            B("heading", { text: "Letter to Shareholders" }),
            B("text", { text: "We entered the year with one priority: convert last year's expansion into durable margin. The results in these pages show that conversion is underway." }),
            B("quote", { text: "Growth is a decision you make every quarter, not an event.", cite: "CEO, Helios Group" })
          ]),
          P("Year in Review", [
            B("heading", { text: "Year in Review" }),
            B("list", { items: ["Industrial division returned to double-digit margin", "Two bolt-on acquisitions integrated ahead of plan", "Net debt reduced by €40M", "Employee retention at a five-year high"] })
          ]),
          P("Outlook", [
            B("heading", { text: "Outlook" }),
            B("cols", { left: "We guide to mid-teens revenue growth with stable capital expenditure.", right: "Full statements and auditor's notes are available in the investor portal." }),
            B("button", { label: "Investor portal", url: "#contact" })
          ])
        ];
        return pr;
      }
    },
    hotel: {
      name: "Hotel Presentation", desc: "Rooms, dining, booking.", pagesLabel: "4 pages · Azure",
      make: function () {
        var pr = store.baseProject("The Meridian House", "azure");
        pr.pages = [
          P("The Meridian House", [
            B("heading", { text: "The Meridian House", size: "l" }),
            B("text", { text: "Twenty-two rooms in a converted merchant's house — quiet luxury on the old harbour." }),
            B("stats", { items: [{ v: "22", l: "Rooms" }, { v: "4.9★", l: "Guest rating" }, { v: "1897", l: "Built" }] })
          ]),
          P("Rooms & Suites", [
            B("heading", { text: "Rooms & Suites" }),
            B("image", { src: "" }),
            B("price", { item: "Harbour Room", desc: "Queen bed, water view", price: "$240" }),
            B("price", { item: "Merchant Suite", desc: "Sitting room, balcony", price: "$390" }),
            B("price", { item: "The Attic", desc: "Full-floor suite, private terrace", price: "$540" })
          ]),
          P("Dining", [
            B("heading", { text: "Dining" }),
            B("text", { text: "Our ground-floor restaurant serves a short, seasonal menu; breakfast is included with every stay and served until a civilised 11:00." }),
            B("quote", { text: "The kind of breakfast that reorganises your ambitions for the day.", cite: "Guest review" })
          ]),
          P("Book Your Stay", [
            B("heading", { text: "Book Your Stay" }),
            B("list", { items: ["Free cancellation to 48 hours", "Direct bookings include harbour-view upgrade when available", "Children and well-behaved dogs welcome"] }),
            B("button", { label: "Check availability", url: "#contact" })
          ])
        ];
        return pr;
      }
    },
    portfolio: {
      name: "Creative Portfolio", desc: "Projects, process, contact.", pagesLabel: "4 pages · Noir",
      make: function () {
        var pr = store.baseProject("Mara Voss — Selected Work", "noir");
        pr.pages = [
          P("Mara Voss", [
            B("heading", { text: "Mara Voss" }),
            B("text", { text: "Brand identity and editorial design. Ten years, four continents, one rule: the work must say something true." })
          ], [{ id: store.uid(), x: 72, y: 30, label: "About", text: "Currently accepting identity projects for Q4.", enabled: true }]),
          P("Harbor Coffee", [
            B("heading", { text: "Harbor Coffee — Identity" }),
            B("image", { src: "" }),
            B("text", { text: "Full rebrand for a six-location roaster: wordmark, packaging system, and a signage program built around tide charts." }),
            B("quote", { text: "Sales of retail bags rose 40% in the redesign's first quarter.", cite: "Harbor Coffee, annual report" })
          ]),
          P("Field Journal", [
            B("heading", { text: "Field Journal — Editorial" }),
            B("image", { src: "" }),
            B("cols", { left: "Quarterly print magazine, 120 pages. Art direction and typographic system.", right: "Named among the year's best-designed independents by two industry annuals." })
          ]),
          P("Work With Me", [
            B("heading", { text: "Work With Me" }),
            B("text", { text: "Identity projects begin at $8,000 and start with a two-week discovery. Editorial engagements are scoped per issue." }),
            B("button", { label: "Email the studio", url: "#contact" })
          ])
        ];
        return pr;
      }
    }
  };

  /* Commercial template factory. These definitions deliberately use different
     page flows and block mixes; sample claims are clearly fictional and links
     stay inside the generated publication until a buyer replaces them. */
  function makeCommercial(title, theme, accent, spec) {
    var pr = store.baseProject(title, theme);
    pr.meta.brand.accent = accent;
    pr.meta.desc = spec.desc;
    pr.meta.templateKey = spec.key;
    var showcaseContacts = {
      catalog: { email: "trade@apertureobjects.studio", phone: "+1 415 555 0142", website: "apertureobjects.studio", address: "18 Foundry Lane · Portland, OR", cta: "Request the trade line sheet" },
      lookbook: { email: "press@northlinecollection.studio", phone: "+44 20 7946 0184", website: "northlinecollection.studio", address: "14 Mercer Yard · London", cta: "Request the collection line sheet" },
      hotel: { email: "stay@harborhouseporto.studio", phone: "+351 22 555 0188", website: "harborhouseporto.studio", address: "8 Cais da Alfândega · Porto", cta: "Plan your stay" },
      company: { email: "newbusiness@stonebridgepractice.studio", phone: "+1 312 555 0176", website: "stonebridgepractice.studio", address: "240 North Franklin · Chicago, IL", cta: "Start a project conversation" },
      restaurant: { email: "reserve@junipertable.studio", phone: "+1 503 555 0138", website: "junipertable.studio", address: "42 Alder Street · Portland, OR", cta: "Reserve your table" }
    };
    var contact = showcaseContacts[spec.key] || { email: "studio@folioengine.studio", phone: "+1 212 555 0190", website: "folioengine.studio", address: "Creative District", cta: "Start a conversation" };
    pr.meta.info = {
      brandName: title.split("—")[0].trim(),
      subtitle: spec.desc.split(".")[0],
      email: contact.email,
      phone: contact.phone,
      website: contact.website,
      address: contact.address,
      cta: contact.cta
    };
    pr.pages = spec.pages.map(function (page, index) {
      var blocks = [B("heading", { text: page[0], size: index === 0 ? "l" : "m", variant: index === 0 ? "editorial" : "standard" })];
      if (page[1]) blocks.push(B("text", { text: page[1] }));
      (page[2] || []).forEach(function (item) {
        if (item[0] === "stats") blocks.push(B("stats", { items: item[1], variant: item[2] || "standard" }));
        else if (item[0] === "list") blocks.push(B("list", { items: item[1] }));
        else if (item[0] === "quote") blocks.push(B("quote", { text: item[1], cite: item[2] }));
        else if (item[0] === "cols") blocks.push(B("cols", { left: item[1], right: item[2] }));
        else if (item[0] === "price") blocks.push(B("price", { item: item[1], desc: item[2], price: item[3] }));
        else if (item[0] === "button") blocks.push(B("button", { label: item[1], url: item[2] || "#contact" }));
        else if (item[0] === "divider") blocks.push(B("divider", {}));
        else if (item[0] === "hero") blocks.push(B("hero", { title: item[1], text: item[2], variant: item[3] || "standard" }));
        else if (item[0] === "product") blocks.push(B("product", { title: item[1], text: item[2], price: item[3], variant: item[4] || "standard" }));
        else if (item[0] === "features") blocks.push(B("features", { items: item[1], variant: item[2] || "standard" }));
        else if (item[0] === "comparison") blocks.push(B("comparison", { title: item[1], left: item[2], right: item[3] }));
        else if (item[0] === "visual") blocks.push(B("visual", { title: item[1], text: item[2], tone: item[3] || "indigo", variant: item[4] || "split" }));
        else if (item[0] === "gallery") blocks.push(B("gallery", { items: item[1], variant: item[2] || "editorial" }));
        else if (item[0] === "contact") blocks.push(B("contact", { title: item[1] || "Get in touch", text: [pr.meta.info.brandName, pr.meta.info.address, pr.meta.info.email, pr.meta.info.phone, pr.meta.info.website].join("\n"), bindings: { text: "contactText" } }));
        else if (item[0] === "cta") blocks.push(B("cta", { title: item[1], text: item[2], label: pr.meta.info.cta, url: "#contact", bindings: { label: "cta" }, variant: item[3] || "standard" }));
      });
      var p = P(page[0], blocks);
      if (index === 0) p.layout = "cover";
      return p;
    });
    return pr;
  }

  function commercial(name, key, theme, accent, audience, blockSummary, pages) {
    return {
      name: name,
      desc: audience,
      pagesLabel: pages.length + " pages · " + blockSummary,
      make: function () {
        return makeCommercial(pages[0][0], theme, accent, {
          key: key,
          desc: audience + ". Includes " + blockSummary + ".",
          pages: pages
        });
      }
    };
  }

  TEMPLATES.catalog = commercial("Luxury Product Catalog", "catalog", "azure", "#2563eb",
    "For premium makers, retailers and wholesale teams", "product stories, pricing, comparison and order CTA", [
      ["Aperture Objects — Luxury Catalog", "A modular homeware collection shaped by honest materials, repairable parts and precise proportions.", [["visual", "Objects, considered", "A precise visual opening for a product-led publication.", "indigo", "full"]]],
      ["Our Design Standard", "Useful objects, honest materials and parts that can be replaced instead of discarded.", [["cols", "Designed for small spaces and daily use.", "Each specification is editable for your own range."]]],
      ["Collection Overview", "Four coordinated families make navigation and merchandising clear.", [["list", ["Arc lighting", "Plane tables", "Nest storage", "Field accessories"]]]],
      ["Featured Products", "Lead with high-priority products and concise benefits.", [["product", "Arc Task Light", "Dimmable, repairable aluminum · three finishes", "$189", "editorial"], ["product", "Plane Side Table", "Powder-coated steel · compact footprint", "$240", "minimal"]]],
      ["Product Grid", "Group products by buyer intent rather than a flat inventory list.", [["gallery", [{ title: "Work", text: "Focused light", tone: "indigo" }, { title: "Live", text: "Flexible storage", tone: "teal" }, { title: "Keep", text: "Tactile accessories", tone: "stone" }], "cards"]]],
      ["Product Detail", "Arc Task Light pairs directional output with a tool-free replaceable LED module.", [["hero", "Arc / 01", "A focused object with a repair-first specification.", "minimal"], ["list", ["Three finish options", "Warm 2700K light", "Five-year parts support"]], ["price", "Arc Task Light", "SKU AO-ARC-01", "$189"]]],
      ["Compare the Range", "A compact decision page helps buyers choose confidently.", [["comparison", "Arc or Halo", "Arc\nPrecise task lighting · 8W · desk clamp.", "Halo\nAmbient lighting · 12W · weighted base."]]],
      ["Materials & Care", "Document materials, care and warranty in the same publication.", [["list", ["Wipe with a dry microfiber cloth", "Replaceable wear components", "Recyclable mono-material packaging"]]]],
      ["Trade & Ordering", "Wholesale terms and lead times belong near the decision point.", [["stats", [{ v: "12", l: "Unit MOQ" }, { v: "3–4", l: "Week lead" }, { v: "2 yr", l: "Warranty" }]]]],
      ["Contact & Order", "Trade contact, lead-time guidance and a clear next step for specification requests.", [["contact", "Trade desk"], ["cta", "Build your specification", "Ask about finishes, lead times and trade pricing.", "minimal"]]]
    ]);

  TEMPLATES.lookbook = commercial("Fashion Editorial Lookbook", "lookbook", "noir", "#db2777",
    "For independent fashion labels and stylists", "editorial spreads, looks, materials and campaign CTA", [
      ["Northline — Editorial 01", "A capsule collection shaped around movement, layering and long-wear materials.", [["visual", "In motion", "Volume, restraint and one mineral palette.", "rose", "full"]]],
      ["Collection Notes", "Nine adaptable pieces in mineral, ink and rust.", [["stats", [{ v: "9", l: "Pieces" }, { v: "3", l: "Materials" }, { v: "1", l: "Palette" }]]]],
      ["The Opening Look", "A quiet monochrome base gives the silhouette room to speak.", [["visual", "Look 01", "Knit shell · wide trouser · brushed metal.", "stone", "split"]]],
      ["Product Spotlight", "The Transit Coat uses a removable liner to move across seasons.", [["price", "Transit Coat", "Ink / Mineral · XS–XL", "$320"], ["list", ["Recycled wool shell", "Detachable liner", "Internal travel pocket"]]]],
      ["Look Combination", "Balance structure with movement by pairing one tailored piece with one soft layer.", [["gallery", [{ title: "Day", text: "Coat + knit", tone: "stone" }, { title: "Evening", text: "Bias + metal", tone: "rose" }, { title: "Detail", text: "Corozo closure", tone: "indigo" }], "strip"]]],
      ["Materials & Details", "Material notes turn visual appeal into purchase confidence.", [["list", ["Traceable recycled wool", "Deadstock cupro lining", "Repairable corozo buttons"]]]],
      ["Behind the Collection", "A short editorial story gives the range a point of view.", [["quote", "We designed fewer pieces and gave each one more work to do.", "Northline design studio"]]],
      ["Size & Care", "Keep practical information close to product interest.", [["cols", "Fit is relaxed; choose your usual size.", "Cool hand wash or responsible dry clean."]]],
      ["Campaign Contact", "Stockist, press and styling enquiries meet in one focused campaign close.", [["contact", "Collection enquiries"], ["cta", "Request the line sheet", "Stockist, press and styling requests.", "minimal"]]]
    ]);

  TEMPLATES.company = commercial("Premium Company Profile", "company", "azure", "#0f766e",
    "For consultancies, studios and service organizations", "mission, services, process, team and case study", [
      ["Stonebridge — Company Profile", "An integrated strategy and design practice for organizations navigating consequential change.", [["hero", "Clarity that travels", "Strategy and design systems for organizations in motion.", "split"], ["stats", [{ v: "12", l: "Specialists" }, { v: "3", l: "Disciplines" }, { v: "1", l: "Integrated team" }], "editorial"]]],
      ["Company Overview", "Stonebridge helps growing organizations clarify complex offers and communicate them consistently.", [["cols", "Strategy creates the shared direction.", "Design turns direction into useful systems."]]],
      ["Mission & Principles", "Make complex work easier to understand and easier to use.", [["list", ["Clarity before decoration", "Evidence before opinion", "Systems before one-off outputs"]]]],
      ["Services", "A focused offer makes the profile easier to scan.", [["price", "Positioning Sprint", "Two-week facilitated engagement", "Custom"], ["price", "Identity System", "Strategy through rollout toolkit", "Custom"]]],
      ["How We Work", "A visible process reduces uncertainty for prospective clients.", [["stats", [{ v: "01", l: "Discover" }, { v: "02", l: "Define" }, { v: "03", l: "Deliver" }]]]],
      ["Team", "Introduce roles, strengths and how the team collaborates.", [["cols", "Strategy · research, positioning, facilitation.", "Design · identity, editorial and digital systems."]]],
      ["Selected Case Study", "A regional manufacturer used a clearer offer architecture to simplify its sales story.", [["visual", "One shared language", "Offer architecture made visible across teams.", "teal", "split"], ["quote", "The new structure gave every team the same language.", "Regional manufacturing partner"]]],
      ["Ways to Engage", "Show buyers a clear next step and what preparation helps.", [["list", ["Bring the business question", "Share existing research", "Name the decision deadline"]]]],
      ["Contact", "A direct route to the team for considered, high-stakes project conversations.", [["contact", "New business"], ["cta", "Bring us the hard question", "We will help frame the decision before proposing the work.", "minimal"]]]
    ]);

  TEMPLATES.brochure = commercial("Interactive Brochure", "brochure", "ivory", "#7c3aed",
    "For service firms, programs and campaign teams", "offer, benefits, proof, process and response CTA", [
      ["Clearpath — Interactive Brochure", "A fictional operations program presented as a concise persuasive journey.", [["quote", "Make the next move easier to see.", "Program promise"]]],
      ["The Challenge", "Growth creates friction when teams, tools and decisions no longer share one operating picture.", [["cols", "Symptoms: repeated work and unclear ownership.", "Opportunity: one practical operating rhythm."]]],
      ["The Offer", "A six-week program that maps work, clarifies decisions and installs a usable cadence.", [["stats", [{ v: "6", l: "Weeks" }, { v: "3", l: "Workshops" }, { v: "1", l: "Playbook" }]]]],
      ["Benefits", "Frame outcomes without unsupported performance promises.", [["list", ["Clearer ownership", "Fewer handoff gaps", "Reusable decision templates"]]]],
      ["Program Modules", "Each module produces an editable working artifact.", [["price", "Map", "Current-state workflow and friction", "Week 1–2"], ["price", "Shape", "Decision rights and priorities", "Week 3–4"], ["price", "Run", "Cadence and playbook", "Week 5–6"]]],
      ["How Delivery Works", "Combine facilitated sessions with focused implementation.", [["cols", "Weekly workshop with the core team.", "Between-session build and validation."]]],
      ["Illustrative Outcome", "Use a transparent fictional example rather than an unverifiable customer claim.", [["quote", "The team left with one shared operating picture and a cadence they could run.", "Illustrative scenario"]]],
      ["Next Step", "Invite the reader to a specific, low-friction action.", [["button", "Discuss your operating challenge", "#contact"]]]
    ]);

  TEMPLATES.restaurant = commercial("Modern Restaurant Menu", "restaurant", "ivory", "#b45309",
    "For restaurants, cafés and private dining teams", "story, categories, dishes, dietary notes and reservation CTA", [
      ["Juniper Table — Seasonal Menu", "A neighborhood kitchen cooking over flame and following the market through the seasons.", [["visual", "Fire / field / table", "A short menu led by the market.", "amber", "full"]]],
      ["Our Table", "Juniper Table cooks over flame and builds each service around local vegetables, grains and carefully sourced proteins.", [["cols", "Dinner · Tuesday to Sunday.", "Private table · up to twelve guests."]]],
      ["Menu Guide", "Use this page as a scannable category overview.", [["list", ["Small plates", "From the hearth", "Mains", "Dessert and drinks"]]]],
      ["Small Plates", "Designed for sharing.", [["price", "Charred carrots", "Labneh, dukkah, citrus", "$12"], ["price", "Market crudo", "Green chili, lime leaf", "$17"], ["price", "Sourdough", "Cultured butter, sea salt", "$7"]]],
      ["From the Hearth", "Familiar ingredients with direct fire and restrained seasoning.", [["price", "Hearth cabbage", "Hazelnut, brown butter", "$18"], ["price", "Line-caught fish", "Fennel, preserved lemon", "$31"]]],
      ["Featured Menu", "A concise tasting route for first-time guests.", [["hero", "The market menu", "Five courses chosen by the kitchen, paced for the whole table.", "minimal"], ["stats", [{ v: "5", l: "Courses" }, { v: "$72", l: "Per guest" }, { v: "90m", l: "Experience" }], "editorial"]]],
      ["Dietary Notes", "Keep dietary guidance visible and specific.", [["list", ["Plant-based menu available with notice", "Gluten handled in the kitchen", "Tell the team about allergies when booking"]]]],
      ["Visit & Reserve", "Opening hours, location and a direct reservation route for the next service.", [["contact", "Juniper Table"], ["cta", "Reserve your table", "Tell us about dietary needs when you book.", "minimal"]]]
    ]);

  TEMPLATES.hotel = commercial("Boutique Hotel & Travel Guide", "hotel", "azure", "#0284c7",
    "For boutique hotels, stays and hospitality groups", "rooms, dining, experiences, local guide and booking CTA", [
      ["Harbor House — Stay Guide", "A 22-room waterfront hotel shaped by quiet interiors, local food and an unhurried harbor.", [["visual", "At the water's edge", "A restored merchant house and an unhurried harbor.", "teal", "full"]]],
      ["The House", "A restored merchant house shaped around quiet rooms, local food and an unhurried harbor setting.", [["quote", "Arrive slowly. Leave restored.", "House philosophy"]]],
      ["Rooms & Suites", "Introduce categories before asking guests to compare.", [["gallery", [{ title: "Courtyard", text: "Quiet garden aspect", tone: "stone" }, { title: "Harbor", text: "Water view", tone: "teal" }, { title: "Loft Suite", text: "Private terrace", tone: "indigo" }], "cards"], ["price", "Courtyard Room", "Queen bed · garden aspect", "$210"], ["price", "Harbor Room", "King bed · water view", "$280"]]],
      ["Signature Suite", "The top-floor suite adds a private terrace and separate sitting room.", [["list", ["Breakfast included", "Late checkout when available", "In-room local guide"]]]],
      ["Dining", "Breakfast follows the market; dinner is a short seasonal menu served Wednesday through Sunday.", [["cols", "Morning · bakery, fruit, eggs to order.", "Evening · four-course harbor menu."]]],
      ["Experiences & Local Guide", "Curate a small set of credible, bookable guest experiences.", [["visual", "A day by the harbor", "Market morning, workshop afternoon, sunset on foot.", "indigo", "split"], ["list", ["Sunrise harbor walk", "Boat-building studio visit", "Chef-led market morning"]]]],
      ["Before You Arrive", "Set expectations clearly to reduce guest uncertainty.", [["cols", "Check-in from 15:00 · checkout by 11:00.", "Parking is limited; reserve in advance."]]],
      ["Book Your Stay", "Room guidance, arrival details and a direct route to the reservations team.", [["contact", "Reservations"], ["cta", "Plan your stay", "Ask about rooms, arrival and local experiences.", "minimal"]]]
    ]);

  TEMPLATES.travel = commercial("Travel Guide", "travel", "azure", "#0891b2",
    "For destination publishers and independent creators", "itinerary, neighborhoods, food, practical tips and map CTA", [
      ["A Long Weekend in Porto", "A fictional editorial guide organized for three walkable days.", [["stats", [{ v: "3", l: "Days" }, { v: "11", l: "Stops" }, { v: "4", l: "Districts" }]]]],
      ["How to Use This Guide", "Follow the days in sequence or use the neighborhood pages to build your own route.", [["list", ["Save key addresses offline", "Book headline sites ahead", "Leave room for unplanned stops"]]]],
      ["Day One — Ribeira", "Begin at the river, climb gradually and finish above the city.", [["list", ["Morning riverside walk", "Market lunch", "Sunset viewpoint"]]]],
      ["Day Two — Cedofeita", "A slower day for galleries, independent shops and neighborhood cafés.", [["quote", "The best route is often one block beyond the famous one.", "Editorial note"]]],
      ["Day Three — Foz", "Follow the river west to the Atlantic and return by tram.", [["cols", "Morning · gardens and coastal walk.", "Evening · seafood near the water."]]],
      ["Eat & Drink", "Organize recommendations by moment, not by a long undifferentiated list.", [["price", "Breakfast", "Bakery and espresso", "€"], ["price", "Dinner", "Seasonal tasting menu", "€€€"]]],
      ["Practical Essentials", "Keep transport, timing and accessibility notes together.", [["list", ["Use a rechargeable transit card", "Expect steep streets and stone paving", "Confirm opening days before travel"]]]],
      ["Plan Your Route", "Replace demonstration notes with verified local information before publishing.", [["button", "Open route notes", "#contact"]]]
    ]);

  TEMPLATES.portfolio = commercial("Creative Portfolio", "portfolio", "noir", "#8b5cf6",
    "For designers, photographers and creative studios", "introduction, selected work, process, services and contact", [
      ["Mira Vale — Selected Work", "A fictional multidisciplinary portfolio with a clear path from point of view to enquiry.", [["quote", "Useful ideas deserve memorable form.", "Studio principle"]]],
      ["Profile", "Mira Vale builds identity and editorial systems for cultural and purpose-led organizations.", [["stats", [{ v: "3", l: "Disciplines" }, { v: "8", l: "Selected works" }, { v: "1", l: "Studio" }]]]],
      ["Project One — Tide Archive", "Identity and publication design for a fictional coastal research archive.", [["cols", "Challenge · make long-term research accessible.", "Response · a modular editorial identity."]]],
      ["Project Two — Common Ground", "Campaign and wayfinding system for a fictional community arts season.", [["quote", "The system made a complex program feel like one invitation.", "Illustrative project reflection"]]],
      ["Project Three — Field Notes", "A flexible publishing system for essays, interviews and image-led stories.", [["list", ["Editorial grid", "Reusable templates", "Accessible color system"]]]],
      ["Process", "A three-stage process keeps creative work connected to the real decision.", [["stats", [{ v: "01", l: "Frame" }, { v: "02", l: "Make" }, { v: "03", l: "Apply" }]]]],
      ["Services", "Clarify scope while leaving room for the right engagement.", [["price", "Identity System", "Strategy, identity, rollout", "Scoped"], ["price", "Editorial System", "Art direction and templates", "Scoped"]]],
      ["Contact", "A concise closing page with a focused invitation to begin the conversation.", [["button", "Start a conversation", "#contact"]]]
    ]);

  TEMPLATES.realestate = commercial("Real Estate Brochure", "realestate", "ivory", "#a16207",
    "For agents, developers and private listings", "property story, features, floor plan notes, location and viewing CTA", [
      ["Cedar Court — Private Residence", "A fictional contemporary courtyard home presented for demonstration only.", [["stats", [{ v: "310m²", l: "Interior" }, { v: "4", l: "Bedrooms" }, { v: "2", l: "Courtyards" }]]]],
      ["Property Story", "Cedar Court organizes daily life around light, privacy and a sheltered central garden.", [["quote", "A calm interior world connected to every room.", "Design intent"]]],
      ["At a Glance", "Give buyers the essential facts before the longer tour.", [["list", ["Four bedrooms and three bathrooms", "Open kitchen and family room", "Independent study", "Two-car covered parking"]]]],
      ["Living Spaces", "The main room opens across the courtyard through full-height sliding panels.", [["cols", "Morning light reaches the kitchen and dining area.", "Deep overhangs shade the west-facing lounge."]]],
      ["Private Rooms", "Bedrooms are separated from entertaining spaces and share a quiet garden outlook.", [["list", ["Primary suite with private terrace", "Flexible guest room or studio", "Integrated storage throughout"]]]],
      ["Materials & Systems", "Include maintenance and performance information buyers can use.", [["cols", "Stone, lime plaster and oak define the interior.", "Heat-pump climate system and solar-ready roof."]]],
      ["Location", "Replace all demonstration distances with verified listing information.", [["stats", [{ v: "8 min", l: "Town center" }, { v: "15 min", l: "Station" }, { v: "40 min", l: "Airport" }]]]],
      ["Arrange a Viewing", "Add the licensed agent, legal disclaimers and current guide price.", [["button", "Viewing information", "#contact"]]]
    ]);

  TEMPLATES.report = commercial("Annual Report", "report", "noir", "#4f46e5",
    "For organizations, nonprofits and reporting teams", "year overview, leadership letter, performance, people and outlook", [
      ["Northstar Cooperative — Annual Review", "A fictional reporting structure with editable demonstration figures.", [["stats", [{ v: "2026", l: "Review" }, { v: "4", l: "Priorities" }, { v: "12", l: "Regions" }]]]],
      ["Year at a Glance", "Use a concise opening to orient readers before detailed sections.", [["list", ["Service reliability strengthened", "Member participation expanded", "Capital program advanced"]]]],
      ["Leadership Letter", "This demonstration copy models tone and structure without asserting a real company result.", [["quote", "The year tested our systems and clarified where long-term value is created.", "Illustrative chair letter"]]],
      ["Performance", "Replace every demonstration metric with audited, sourced figures.", [["stats", [{ v: "94%", l: "Service level" }, { v: "18", l: "Projects" }, { v: "6", l: "Programs" }]]]],
      ["Operations", "Explain what changed, why it mattered and what comes next.", [["cols", "Delivery: simplified handoffs and reporting.", "Resilience: diversified critical suppliers."]]],
      ["People & Community", "Balance quantitative reporting with accountable program descriptions.", [["list", ["Skills program launched", "Safety reviews completed", "Community grant model revised"]]]],
      ["Governance", "Summarize oversight, material risks and decision responsibilities.", [["cols", "Board committees reviewed priority risks quarterly.", "Management owners tracked mitigations monthly."]]],
      ["Outlook", "Separate current evidence from forward-looking priorities.", [["list", ["Complete the service modernization program", "Strengthen member feedback loops", "Publish verified impact measures"]]]],
      ["Reporting Contact", "Add audited statements, methodology and verified contact information.", [["button", "Open reporting information", "#contact"]]]
    ]);

  TEMPLATES.investor = commercial("Investor Presentation", "investor", "noir", "#16a34a",
    "For founders and internal strategy teams", "problem, solution, market framing, model, roadmap and ask", [
      ["Relay Works — Investor Presentation", "A fictional workflow software concept used only to demonstrate presentation structure.", [["quote", "Turn operational signals into clear next actions.", "Concept proposition"]]],
      ["Problem", "Distributed operations often rely on delayed reports and fragmented local workarounds.", [["cols", "Teams see different versions of the same issue.", "Leaders respond after the cost is visible."]]],
      ["Solution", "Relay Works is a fictional concept for structured issue capture, ownership and follow-through.", [["list", ["Consistent intake", "Clear ownership", "Visible resolution history"]]]],
      ["Market Framing", "Replace demonstration framing with sourced, current research before external use.", [["stats", [{ v: "3", l: "Buyer roles" }, { v: "2", l: "Core workflows" }, { v: "1", l: "Shared record" }]]]],
      ["Product Flow", "Show how the user moves from signal to resolution.", [["stats", [{ v: "01", l: "Capture" }, { v: "02", l: "Assign" }, { v: "03", l: "Resolve" }]]]],
      ["Business Model", "Keep pricing logic transparent and avoid invented traction.", [["price", "Team plan", "Core workflow and history", "Illustrative"], ["price", "Organization plan", "Controls and reporting", "Illustrative"]]],
      ["Go-to-Market", "Describe testable channels and the evidence required to scale them.", [["list", ["Founder-led design partners", "Role-specific workflow content", "Partner-led implementation"]]]],
      ["Roadmap", "Tie milestones to learning and product risk.", [["cols", "Now · validate one repeatable workflow.", "Next · broaden roles after retention evidence."]]],
      ["The Ask", "Replace demonstration content with the verified raise, use of funds and contact.", [["button", "Investor contact details", "#contact"]]]
    ]);

  TEMPLATES.furniture = commercial("Furniture Catalog", "furniture", "ivory", "#92400e",
    "For furniture studios, showrooms and contract suppliers", "collection story, products, dimensions, finishes, care and trade CTA", [
      ["Atelier Form — Furniture Collection", "A fictional collection of adaptable pieces for compact interiors.", [["stats", [{ v: "12", l: "Pieces" }, { v: "5", l: "Finishes" }, { v: "2 yr", l: "Warranty" }]]]],
      ["Collection Story", "Soft geometry and repairable construction connect the range.", [["quote", "Made to settle into a room, not dominate it.", "Design note"]]],
      ["Seating", "Start with collection-level context before individual specifications.", [["price", "Linden Chair", "Solid ash · woven seat", "$420"], ["price", "Vale Lounge", "Oak frame · wool upholstery", "$1,240"]]],
      ["Tables", "Coordinate dimensions, finish and lead time.", [["price", "Plane Table", "160 × 80 cm · seats six", "$1,680"], ["price", "Fold Side Table", "45 × 45 cm", "$280"]]],
      ["Product Detail", "The Linden Chair uses a replaceable woven seat and knock-down joinery.", [["list", ["Natural or smoked ash", "Paper-cord seat", "Domestic replacement parts"]]]],
      ["Finishes", "Explain variation and care before ordering.", [["cols", "Timber: natural oil, smoked oil, black stain.", "Textile: six contract-grade wool colors."]]],
      ["Dimensions & Planning", "Provide verified drawings and clearance guidance in the final publication.", [["list", ["Allow 75 cm circulation", "Confirm access dimensions", "Request contract specification sheet"]]]],
      ["Care & Warranty", "Clear aftercare supports trust and reduces avoidable support requests.", [["cols", "Clean with a damp cloth; avoid harsh chemicals.", "Two-year structural warranty for normal use."]]],
      ["Trade Enquiries", "Add current lead times, freight zones and trade terms.", [["button", "Request trade information", "#contact"]]]
    ]);

  TEMPLATES.jewelry = commercial("Jewelry Catalog", "jewelry", "noir", "#a21caf",
    "For jewelry studios, collections and private appointments", "collection story, pieces, materials, sizing, care and appointment CTA", [
      ["Lumen Studio — Objects of Light", "A fictional small-batch jewelry collection for demonstrating a refined sales publication.", [["quote", "Light changes the object; the wearer completes it.", "Collection note"]]],
      ["Collection Story", "Six forms explore reflection, weight and negative space.", [["stats", [{ v: "6", l: "Forms" }, { v: "3", l: "Metals" }, { v: "1", l: "Edition" }]]]],
      ["Rings", "Present material, scale and price with equal clarity.", [["price", "Orbit Ring", "Recycled silver · 8 mm", "$180"], ["price", "Line Signet", "Silver or vermeil", "$240"]]],
      ["Neckpieces", "Describe length, fastening and finish.", [["price", "Arc Pendant", "45 cm trace chain", "$260"], ["price", "Double Line", "Adjustable 42–50 cm", "$320"]]],
      ["Signature Piece", "The Halo Cuff is formed from a single recycled silver profile and finished by hand.", [["list", ["Three sizes", "Matte or polished", "Numbered edition"]]]],
      ["Materials", "Use exact hallmark, plating and sourcing details in your final catalog.", [["cols", "Metals · recycled sterling silver and 18k vermeil.", "Stones · traceable lab-grown sapphire."]]],
      ["Sizing & Care", "Practical guidance helps customers order confidently.", [["list", ["Use the printable sizing guide", "Store pieces separately", "Avoid perfume and chlorinated water"]]]],
      ["Private Appointments", "Add verified studio location and appointment terms.", [["button", "Appointment information", "#contact"]]]
    ]);

  TEMPLATES.architecture = commercial("Architecture Portfolio", "architecture", "ivory", "#57534e",
    "For architecture practices and spatial designers", "practice, approach, project studies, process, team and enquiries", [
      ["Common Field — Selected Architecture", "A fictional practice portfolio organized around built work, process and responsibility.", [["quote", "Architecture begins with what is already there.", "Practice position"]]],
      ["Practice", "Common Field is a fictional small practice working across homes, civic rooms and adaptive reuse.", [["stats", [{ v: "3", l: "Project types" }, { v: "5", l: "Team members" }, { v: "1", l: "Shared method" }]]]],
      ["Approach", "Start with climate, existing fabric and the everyday patterns of use.", [["list", ["Survey before proposition", "Passive performance first", "Details designed for repair"]]]],
      ["Project — Courtyard House", "A compact family home organized around a shaded outdoor room.", [["cols", "Brief · privacy, daylight and flexible family space.", "Response · rooms wrapped around a planted court."]]],
      ["Project — Library Room", "An adaptive-reuse reading room inserted into a former workshop.", [["quote", "The new work remains legible without competing with the old.", "Project principle"]]],
      ["Project — Market Canopy", "A demountable timber canopy for weekly community use.", [["list", ["Standard timber sections", "Dry connections", "Rainwater collection"]]]],
      ["Process", "Make project stages and client decisions visible.", [["stats", [{ v: "01", l: "Brief" }, { v: "02", l: "Design" }, { v: "03", l: "Deliver" }]]]],
      ["Team & Capabilities", "Introduce the people and professional scope behind the work.", [["cols", "Architecture · interiors · planning.", "Research · briefing · post-occupancy review."]]],
      ["New Projects", "Add registrations, office details and verified contact information.", [["button", "Discuss a project", "#contact"]]]
    ]);

  TEMPLATES.magazine = commercial("Magazine", "magazine", "noir", "#e11d48",
    "For independent editors, journals and brand publishers", "cover, contents, features, interview, notes and subscription CTA", [
      ["Margin — Issue 04", "A fictional independent magazine issue about useful constraints.", [["quote", "What becomes possible when more is not the answer?", "Issue question"]]],
      ["Contents", "A readable contents page gives longer publications a clear map.", [["list", ["04 — Opening essay", "12 — Studio visit", "24 — Field notes", "36 — Interview", "48 — Back page"]]]],
      ["Opening Essay", "Constraint can be a creative material: a boundary that gives attention somewhere useful to gather.", [["cols", "Part one · limits that sharpen the brief.", "Part two · systems that make repetition meaningful."]]],
      ["Studio Visit", "Inside a fictional workshop where one tool family supports an entire collection.", [["quote", "Consistency is not sameness; it is a shared grammar.", "Studio conversation"]]],
      ["Field Notes", "Short observations create rhythm between longer features.", [["list", ["A repaired handle tells the product history", "The best signage answers one question", "Every archive needs a retrieval habit"]]]],
      ["Interview", "A structured conversation with a fictional editor about slow publishing.", [["cols", "Question · What earns a place in the issue?", "Answer · Work that changes how we notice ordinary things."]]],
      ["Object Study", "A close reading of one everyday object demonstrates product and editorial blocks together.", [["price", "No. 04 Desk Tray", "Folded aluminum · 240 mm", "$68"]]],
      ["Contributors", "Credit real contributors accurately before publication.", [["list", ["Editor", "Art director", "Writers", "Photography", "Production"]]]],
      ["Subscribe & Contact", "Subscription information and editorial contact details in one decisive close.", [["button", "Subscription information", "#contact"]]]
    ]);

  /* ---------- Library UI ---------- */
  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
    catch (e) { return ""; }
  }

  function coverPreview(p) {
    var thumb = p.thumbnail || {};
    var palettes = {
      ivory: ["#8b6f47", "#2f261d"],
      noir: ["#4f46e5", "#111827"],
      azure: ["#0284c7", "#172554"]
    };
    var colors = palettes[p.theme] || palettes.noir;
    var accent = /^#[0-9a-f]{6}$/i.test(thumb.accent || "") ? thumb.accent : colors[0];
    var title = thumb.title || p.title || "Untitled publication";
    var subtitle = thumb.subtitle || ((p.pages || 0) + " page publication");
    var key = store.escapeHtml(thumb.templateKey || "publication");
    return '<div class="project-cover-preview cover-' + key + '" style="--cover-a:' + accent + ';--cover-b:' + colors[1] + '">' +
      '<div class="project-cover-art" aria-hidden="true"><i></i><i></i><i></i></div>' +
      '<small>' + store.escapeHtml((thumb.templateKey || p.status || "PUBLICATION").replace(/[-_]/g, " ").toUpperCase()) + '</small>' +
      '<b>' + store.escapeHtml(title) + '</b><span>' + store.escapeHtml(subtitle.slice(0, 90)) + '</span></div>';
  }

  function renderLibrary() {
    var grid = document.getElementById("projectGrid");
    var list = store.listProjects();
    var q = (document.getElementById("libSearch").value || "").toLowerCase().trim();
    if (q) list = list.filter(function (r) { return (r.title || "").toLowerCase().indexOf(q) !== -1; });
    var status = document.getElementById("libStatus").value;
    if (status === "active") list = list.filter(function (r) { return r.status !== "Archived"; });
    else if (status !== "all") list = list.filter(function (r) { return r.status === status; });
    var sort = document.getElementById("libSort").value;
    if (sort === "name") list.sort(function (a, b) { return (a.title || "").localeCompare(b.title || ""); });
    else if (sort === "pages") list.sort(function (a, b) { return (b.pages || 0) - (a.pages || 0); });
    list.sort(function (a, b) { return (b.fav === true) - (a.fav === true); });
    grid.innerHTML = "";
    if (!list.length) {
      grid.innerHTML = '<div class="lib-empty">' + (q ? "No publications match your search." : "No publications yet — create your first one.") + '</div>';
      return;
    }
    list.forEach(function (p) {
      var card = document.createElement("div");
      card.className = "proj-card";
      card.innerHTML =
        '<div class="proj-thumb" data-theme="' + store.escapeHtml(p.theme || "ivory") + '" aria-label="Cover preview for ' + store.escapeHtml(p.title) + '">' +
          coverPreview(p) + '</div>' +
        '<div class="proj-body">' +
          '<div class="proj-title">' + store.escapeHtml(p.title) + '</div>' +
          '<div class="proj-meta"><span class="proj-status ' + (p.status === "Published" ? "pub" : "") + '">' +
            store.escapeHtml(p.status || "Draft") + '</span> ' + p.pages + ' pages · ' +
            (p.words || 0) + ' words · ' + (p.images || 0) + ' img · ' + fmtDate(p.updatedAt) + '</div>' +
        '</div>' +
        '<div class="proj-actions">' +
          '<button class="icon-btn fav' + (p.fav ? " on" : "") + '" data-act="fav" title="Favorite" aria-label="Toggle favorite">' + (p.fav ? "★" : "☆") + '</button>' +
          '<button class="btn sm primary" data-act="open">Open</button>' +
          '<button class="icon-btn" data-act="rename" title="Rename">✎</button>' +
          '<button class="icon-btn" data-act="dup" title="Duplicate">⧉</button>' +
          '<button class="icon-btn" data-act="archive" title="' + (p.status === "Archived" ? "Restore from archive" : "Archive") + '" aria-label="' + (p.status === "Archived" ? "Restore publication from archive" : "Archive publication") + '">' + (p.status === "Archived" ? "↥" : "⌄") + '</button>' +
          '<button class="icon-btn del" data-act="del" title="Delete">×</button>' +
        '</div>';

      card.querySelector('[data-act="fav"]').addEventListener("click", function () {
        store.toggleFavorite(p.id);
        renderLibrary();
      });
      card.querySelector('[data-act="open"]').addEventListener("click", function () { openAndEnter(p.id); });
      card.querySelector(".proj-body").addEventListener("click", function () { openAndEnter(p.id); });
      card.querySelector('[data-act="rename"]').addEventListener("click", function () {
        openRename(p.id, p.title);
      });
      card.querySelector('[data-act="dup"]').addEventListener("click", function () {
        var nid = store.duplicateProject(p.id);
        if (nid) { renderLibrary(); global.FolioToast.show("Project duplicated"); }
      });
      card.querySelector('[data-act="archive"]').addEventListener("click", function () {
        var archived = store.toggleArchive(p.id);
        renderLibrary();
        global.FolioToast.show(archived ? "Publication archived" : "Publication restored");
      });
      card.querySelector('[data-act="del"]').addEventListener("click", function () {
        global.FolioUI.confirm('Delete "' + p.title + '"? This removes the whole publication.', function () {
          var raw = store.deleteProject(p.id);
          renderLibrary();
          global.FolioToast.show("Project deleted", "Undo", function () {
            if (raw) store.restoreProjectRaw(raw);
            renderLibrary();
          });
        });
      });
      grid.appendChild(card);
    });
  }

  /* ---------- Rename modal ---------- */
  var renameTarget = null;
  function openRename(id, current) {
    renameTarget = id;
    document.getElementById("renameInput").value = current;
    document.getElementById("renameBackdrop").classList.add("open");
    document.getElementById("renameInput").focus();
  }

  function applyRename() {
    var v = document.getElementById("renameInput").value.trim();
    if (!v) { global.FolioToast.show("Title cannot be empty"); return; }
    store.renameProject(renameTarget, v);
    document.getElementById("renameBackdrop").classList.remove("open");
    renderLibrary();
    if (store.state.id === renameTarget) {
      var t = document.getElementById("pubTitle");
      if (t) t.value = v;
    }
    renameTarget = null;
  }

  /* ---------- open/close ---------- */
  function showLibrary() {
    renderLibrary();
    var cont = document.getElementById("btnHeroContinue");
    var active = store.getActiveId();
    var entry = active ? store.listProjects().filter(function (r) { return r.id === active; })[0] : null;
    if (entry) {
      cont.style.display = "";
      cont.textContent = 'Continue "' + entry.title + '"';
    } else {
      cont.style.display = "none";
    }
    document.getElementById("libraryScreen").classList.add("open");
  }

  function hideLibrary() {
    document.getElementById("libraryScreen").classList.remove("open");
  }

  function openAndEnter(id) {
    if (!store.openProject(id)) {
      global.FolioToast.show("Could not open that project — its data may be corrupted");
      return;
    }
    hideLibrary();
    global.FolioApp.enterProject();
  }

  var pendingType = null;
  var pendingTpl = null;

  function showWizardStep(step) {
    [1, 2, 3, 4, 5, 6].forEach(function (n) {
      document.getElementById("tplStep" + n).hidden = n !== step;
    });
    var titles = ["", "Choose publication type", "Choose a template", "Set up your brand", "Add publication details", "Review your publication", "Create publication"];
    var leads = ["", "Tell us what you are creating so we can show the strongest starting points.", "Choose a genuine content structure with a distinct page flow.", "Set the visual foundation. Every choice remains editable later.", "Add the metadata readers and exported files will use.", "Confirm exactly what Folio Engine will create.", "Your editable publication is ready to build."];
    document.getElementById("wizardTitle").textContent = titles[step];
    document.getElementById("wizardLead").textContent = leads[step];
    document.querySelectorAll(".wizard-progress span").forEach(function (dot, index) {
      dot.classList.toggle("active", index < step);
    });
  }

  function openWizard() {
    resetWizard();
    document.getElementById("tplBackdrop").classList.add("open");
  }

  function chooseType(type) {
    pendingType = type;
    document.querySelectorAll("[data-template]").forEach(function (card) {
      card.hidden = card.dataset.type !== type;
    });
    showWizardStep(2);
    var first = document.querySelector('#tplStep2 [data-template]:not([hidden])');
    if (first) first.focus();
  }

  function createFromTemplate(key) {
    pendingTpl = key;
    var tpl = TEMPLATES[key];
    document.getElementById("wzTitle").value = tpl.make().meta.title;
    document.getElementById("wzAccent").value = "#000000";
    document.getElementById("wzHead").value = "";
    document.getElementById("wzAuthor").value = "";
    document.getElementById("wzDesc").value = tpl.desc;
    document.getElementById("wzMode").value = "book";
    showWizardStep(3);
    document.getElementById("wzTitle").focus();
  }

  function detailsSetup() {
    var title = document.getElementById("wzTitle").value.trim();
    if (!title) { global.FolioToast.show("Add a publication title before continuing"); document.getElementById("wzTitle").focus(); return; }
    showWizardStep(4);
    document.getElementById("wzAuthor").focus();
  }

  function reviewSetup() {
    var title = document.getElementById("wzTitle").value.trim();
    if (!title) { global.FolioToast.show("Add a publication title before continuing"); document.getElementById("wzTitle").focus(); return; }
    var tpl = TEMPLATES[pendingTpl];
    var review = document.getElementById("wzReview");
    review.innerHTML = "";
    [
      ["Publication type", pendingType === "catalog" ? "Catalogs & Lookbooks" : (pendingType === "hospitality" ? "Hospitality & Travel" : (pendingType === "creative" ? "Editorial & Portfolio" : (pendingType === "business" ? "Business & Property" : "Blank")))],
      ["Template", tpl.name],
      ["Title", title],
      ["Structure", tpl.pagesLabel],
      ["Author / company", document.getElementById("wzAuthor").value.trim() || "Not set"],
      ["Reading mode", document.getElementById("wzMode").selectedOptions[0].textContent],
      ["Heading style", document.getElementById("wzHead").selectedOptions[0].textContent]
    ].forEach(function (item) {
      var row = document.createElement("div");
      var label = document.createElement("span"); label.textContent = item[0];
      var value = document.createElement("b"); value.textContent = item[1];
      row.appendChild(label); row.appendChild(value); review.appendChild(row);
    });
    var swatch = document.createElement("i");
    swatch.className = "review-swatch";
    swatch.style.background = document.getElementById("wzAccent").value;
    review.appendChild(swatch);
    showWizardStep(5);
    document.getElementById("btnWzPrepare").focus();
  }

  function wizardCreate() {
    var tpl = TEMPLATES[pendingTpl];
    if (!tpl) return;
    var pr = tpl.make();
    var title = document.getElementById("wzTitle").value.trim();
    if (title) {
      pr.meta.title = title;
      if (pr.meta.info) pr.meta.info.brandName = title.split("—")[0].trim();
    }
    if (pr.meta.info) {
      var info = pr.meta.info;
      var infoValues = Object.assign({}, info, {
        contactText: [info.brandName, info.address, info.email, info.phone, info.website].filter(Boolean).join("\n")
      });
      pr.pages.forEach(function (page) {
        (page.blocks || []).forEach(function (block) {
          Object.keys(block.bindings || {}).forEach(function (property) {
            if (infoValues[block.bindings[property]] !== undefined) block[property] = infoValues[block.bindings[property]];
          });
        });
      });
    }
    var acc = document.getElementById("wzAccent").value;
    pr.meta.brand = pr.meta.brand || { accent: "", headingFont: "", bodyFont: "", radius: "" };
    if (acc && acc !== "#000000") pr.meta.brand.accent = acc;
    pr.meta.brand.headingFont = document.getElementById("wzHead").value;
    pr.meta.author = document.getElementById("wzAuthor").value.trim();
    pr.meta.desc = document.getElementById("wzDesc").value.trim();
    pr.settings.mode = document.getElementById("wzMode").value;
    store.createProject(pr);
    resetWizard();
    document.getElementById("tplBackdrop").classList.remove("open");
    hideLibrary();
    global.FolioApp.enterProject();
    global.FolioToast.show(tpl.name + " created");
  }

  function resetWizard() {
    pendingType = null;
    pendingTpl = null;
    document.querySelectorAll("[data-template]").forEach(function (card) { card.hidden = false; });
    showWizardStep(1);
  }

  function restoreSamples() {
    ["restaurant", "lookbook", "brochure", "portfolio"].forEach(function (k) {
      var pr = TEMPLATES[k].make();
      var slimId = pr.id;
      store.createProject(pr); // creates + activates each; last one stays active
      void slimId;
    });
    renderLibrary();
    global.FolioToast.show("Sample publications restored");
  }

  function init() {
    document.getElementById("btnLibNew").addEventListener("click", openWizard);
    document.getElementById("btnTplCancel").addEventListener("click", function () {
      resetWizard();
      document.getElementById("tplBackdrop").classList.remove("open");
    });
    document.getElementById("tplBackdrop").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) { resetWizard(); e.currentTarget.classList.remove("open"); }
    });
    document.getElementById("btnWzBackType").addEventListener("click", function () { showWizardStep(1); });
    document.getElementById("btnWzBack").addEventListener("click", function () { showWizardStep(2); });
    document.getElementById("btnWzBackBrand").addEventListener("click", function () { showWizardStep(3); });
    document.getElementById("btnWzBackDetails").addEventListener("click", function () { showWizardStep(4); });
    document.getElementById("btnWzBackReview").addEventListener("click", function () { showWizardStep(5); });
    document.getElementById("btnWzDetails").addEventListener("click", detailsSetup);
    document.getElementById("btnWzReview").addEventListener("click", reviewSetup);
    document.getElementById("btnWzPrepare").addEventListener("click", function () {
      var tpl = TEMPLATES[pendingTpl];
      document.getElementById("wzReadyText").textContent = tpl.name + " will create " + tpl.pagesLabel + " with your selected brand and metadata.";
      showWizardStep(6);
      document.getElementById("btnWzCreate").focus();
    });
    document.getElementById("btnWzCreate").addEventListener("click", wizardCreate);
    document.getElementById("wzTitle").addEventListener("keydown", function (e) {
      if (e.key === "Enter") detailsSetup();
    });

    /* Welcome hero */
    document.getElementById("btnHeroNew").addEventListener("click", openWizard);
    document.getElementById("btnHeroContinue").addEventListener("click", function () {
      var id = store.getActiveId();
      if (id) openAndEnter(id);
    });
    document.getElementById("btnQuickImport").addEventListener("click", function () {
      document.getElementById("libImportInput").click();
    });
    document.getElementById("btnQuickDocs").addEventListener("click", function () {
      window.open("docs/documentation.html", "_blank", "noopener");
    });
    document.getElementById("btnQuickTour").addEventListener("click", function () {
      var id = store.getActiveId();
      if (id) { openAndEnter(id); setTimeout(global.FolioTour.start, 400); }
      else global.FolioToast.show("Create or open a publication first, then replay the walkthrough");
    });
    document.getElementById("btnQuickHelp").addEventListener("click", function () {
      document.getElementById("helpBackdrop").classList.add("open");
    });
    document.querySelectorAll("[data-template]").forEach(function (btn) {
      btn.addEventListener("click", function () { createFromTemplate(btn.dataset.template); });
    });
    document.querySelectorAll("[data-pubtype]").forEach(function (btn) {
      btn.addEventListener("click", function () { chooseType(btn.dataset.pubtype); });
    });
    document.querySelectorAll("[data-popular-template]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        resetWizard();
        document.getElementById("tplBackdrop").classList.add("open");
        var key = btn.dataset.popularTemplate;
        pendingType = key === "restaurant" ? "hospitality" : (key === "company" ? "business" : "catalog");
        createFromTemplate(key);
      });
    });

    var libImport = document.getElementById("libImportInput");
    document.getElementById("btnLibImport").addEventListener("click", function () { libImport.click(); });
    libImport.addEventListener("change", function (e) {
      var f = e.target.files[0];
      if (f) store.importProject(f, function (ok) { if (ok) renderLibrary(); });
      libImport.value = "";
    });

    document.getElementById("btnRenameApply").addEventListener("click", applyRename);
    document.getElementById("btnRenameCancel").addEventListener("click", function () {
      document.getElementById("renameBackdrop").classList.remove("open");
      renameTarget = null;
    });
    document.getElementById("renameBackdrop").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) { e.currentTarget.classList.remove("open"); renameTarget = null; }
    });
    document.getElementById("renameInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter") applyRename();
    });

    document.getElementById("libSearch").addEventListener("input", renderLibrary);
    document.getElementById("libSort").addEventListener("change", renderLibrary);
    document.getElementById("libStatus").addEventListener("change", renderLibrary);
    document.getElementById("btnProjects").addEventListener("click", function () {
      store.save(true);
      showLibrary();
    });
  }

  global.FolioProjects = {
    init: init,
    showLibrary: showLibrary,
    hideLibrary: hideLibrary,
    renderLibrary: renderLibrary,
    restoreSamples: restoreSamples,
    TEMPLATES: TEMPLATES
  };
})(window);
