import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { ChevronDown } from 'lucide-react';

const FAQ: React.FC = () => {
  const { faqData } = useData();
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleFAQ = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="py-24 bg-black">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-3xl md:text-5xl font-bold text-center mb-12">
          Frequently Asked <span className="text-pink-500">Questions</span>
        </h2>

        {faqData.length === 0 ? (
          <p className="text-center text-gray-500">No questions yet.</p>
        ) : (
          <div className="space-y-4">
            {faqData.map((item) => (
              <div key={item.id} className="w-full">
                <button
                  onClick={() => toggleFAQ(item.id)}
                  className={`w-full flex items-center justify-between p-6 rounded-xl bg-neutral-900 border border-white/5 hover:bg-neutral-800 transition-all duration-300 text-left group ${openId === item.id ? 'rounded-b-none border-b-0' : ''}`}
                >
                  <span className="text-lg font-semibold text-gray-200 group-hover:text-white">
                    {item.question}
                  </span>
                  <ChevronDown 
                    className={`text-gray-400 transform transition-transform duration-300 ${openId === item.id ? 'rotate-180 text-pink-500' : ''}`} 
                    size={20} 
                  />
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out bg-neutral-900/50 border-x border-b border-white/5 rounded-b-xl ${
                    openId === item.id ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="p-6 pt-0 text-gray-400 leading-relaxed">
                    {item.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FAQ;
