import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import "./app.css";

type MessageType =
  | "register"
  | "init"
  | "data"
  | "request_data"
  | "simulate_event";

interface Message {
  type: MessageType;
  data?: any;
}

interface EventData {
  name: string;
  value: number;
}

const simChannel = "microbitML";
const defaultEvent: EventData = { name: "unknown", value: 1 };
const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

const App = () => {
  const [events, setEvents] = useState<EventData[]>([defaultEvent]);
  const [selectedEvent, setSelectedEvent] = useState<number>(
    defaultEvent.value
  );

  const stringToUint8Array = useCallback((input: string): Uint8Array => {
    return textEncoder.encode(input);
  }, []);

  const sendMessage = useCallback((payload: Uint8Array) => {
    window.parent.postMessage(
      {
        type: "messagepacket",
        channel: simChannel,
        data: payload,
      },
      "*"
    );
  }, []);

  const simulateEvent = useCallback(
    (value: number) => {
      const payload: Message = {
        type: "simulate_event",
        data: value,
      };
      sendMessage(stringToUint8Array(JSON.stringify(payload)));
    },
    [sendMessage, stringToUint8Array]
  );

  const requestEventData = useCallback(
    (message: Message) => {
      sendMessage(stringToUint8Array(JSON.stringify(message)));
    },
    [sendMessage, stringToUint8Array]
  );

  const handleMessagePacket = useCallback(
    (message: any) => {
      const data = textDecoder.decode(new Uint8Array(message.data));
      const msg = JSON.parse(data) as Message;
      switch (msg.type) {
        case "register": {
          // Message causes simulator to be loaded as an iframe. No-op.
          break;
        }
        case "init": {
          // Send message back to extension to confirm initialization and request event data.
          requestEventData({ type: "request_data" });
          break;
        }
        case "data": {
          const eventData = msg.data as EventData[];
          if (eventData.length) {
            setEvents(eventData);
            setSelectedEvent(eventData[0].value);
          }
          break;
        }
      }
    },
    [requestEventData]
  );

  // Used to prevent two calls inside useEffect while running
  // locally with React StrictMode.
  const ignore = useRef(false);
  useEffect(() => {
    const listener = (ev: MessageEvent<any>) => {
      if (ev.data?.channel === simChannel) {
        switch (ev.data?.type) {
          case "messagepacket":
            return handleMessagePacket(ev.data);
        }
      }
    };
    window.addEventListener("message", listener);

    if (!ignore.current) {
      // Simulator is ready, request event data.
      requestEventData({ type: "request_data" });
    }
    return () => {
      ignore.current = true;
      window.removeEventListener("message", listener);
    };
  }, [handleMessagePacket, requestEventData]);

  const handleSelectChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const value = parseInt(e.currentTarget.value);
      if (!isNaN(value)) {
        setSelectedEvent(value);
        simulateEvent(value);
      }
    },
    [simulateEvent]
  );

  return (
    <div className="container">
      <p>Simulate machine learning event:</p>
      <select
        aria-label="Select event"
        value={selectedEvent}
        onChange={handleSelectChange}
      >
        {events.map((event) => (
          <option key={event.value} value={event.value}>
            {event.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default App;
