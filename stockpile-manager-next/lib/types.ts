// データベースの型定義
export interface Family {
    id: string;
    name: string;
    invite_code: string;
    created_at: string;
}

export interface User {
    id: string;
    family_id: string | null;
    display_name: string | null;
    line_user_id: string | null;
    created_at: string;
}

export interface Item {
    id: string;
    family_id: string;
    name: string;
    quantity: number;
    expiry_date: string;
    bag_id: string | null;
    location_note: string | null;
    notified_30: boolean;
    notified_7: boolean;
    notified_1: boolean;
    created_at: string;
}

export interface Bag {
    id: string;
    family_id: string;
    name: string;
    created_at: string;
}
