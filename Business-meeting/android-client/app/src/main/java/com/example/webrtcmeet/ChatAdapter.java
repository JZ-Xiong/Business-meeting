package com.example.webrtcmeet;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.List;

/**
 * RecyclerView adapter for chat messages.
 */
public class ChatAdapter extends RecyclerView.Adapter<ChatAdapter.VH> {

    public static class ChatItem {
        public final String sender;
        public final String text;
        public final long timestamp;
        public final boolean isSelf;

        public ChatItem(String sender, String text, long timestamp, boolean isSelf) {
            this.sender = sender;
            this.text = text;
            this.timestamp = timestamp;
            this.isSelf = isSelf;
        }
    }

    private final List<ChatItem> items = new ArrayList<>();

    public void addMessage(ChatItem item) {
        items.add(item);
        notifyItemInserted(items.size() - 1);
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_chat_message, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        ChatItem item = items.get(position);
        holder.tvSender.setText(item.sender);
        holder.tvText.setText(item.text);

        // Align self messages to the right
        if (item.isSelf) {
            holder.tvSender.setTextColor(0xFF6C63FF); // primary color
            holder.tvText.setBackgroundColor(0xFF6C63FF);
            holder.tvText.setTextColor(0xFFFFFFFF);
        } else {
            holder.tvSender.setTextColor(0xFF94A3B8);
            holder.tvText.setBackgroundColor(0xFF1E2433);
            holder.tvText.setTextColor(0xFFE2E8F0);
        }
    }

    @Override
    public int getItemCount() { return items.size(); }

    static class VH extends RecyclerView.ViewHolder {
        TextView tvSender, tvText;
        VH(View v) {
            super(v);
            tvSender = v.findViewById(R.id.tvChatSender);
            tvText = v.findViewById(R.id.tvChatText);
        }
    }
}
