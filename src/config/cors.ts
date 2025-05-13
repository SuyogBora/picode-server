const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8000',
    'http://localhost:5173'
];

export const corsOptions = {
    origin: (origin: any, callback: Function) => {
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            // callback(new Error('Not allowed by CORS'));
            console.log(origin, "origin")
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
};
