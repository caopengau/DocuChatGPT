export const PLANS = [
  {
    name: 'Free',
    slug: 'free',
    sizePerFile: 4,  // in MB
    quota: 10,
    pagesPerPdf: 5,
    price: {
      amount: 0,
      priceIds: {
        test: '',
        production: '',
      },
    },
  },
  {
    name: 'Pro',
    slug: 'pro',
    sizePerFile: 25,  // in MB
    quota: 50,
    pagesPerPdf: 25,
    price: {
      amount: 24.99,
      priceIds: {
        test: 'price_1OVPbOLXPRAUz7eEKJ9ck0UD',
        production: '',
      },
    },
  },
]
